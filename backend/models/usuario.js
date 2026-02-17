/**
 * modelo usuario
 * define la tabla usuario en la base de datos
 * almacena la informacion de los usuarios del sistema
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar bcrypt para encriptar contraseñas
const bcrypt = require('bcrypt');

//importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * definir modelo usuario
 */
const usuario = sequelize.define('usuario', {
    //campos de la tabla 
    //id identificador unico (primary key)
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'el nombre no puede estar vacio'
            },
            len: {
                args: [2, 100],
                msg: 'el nombre debe tener entre 2 y 100 caracteres'
            }
        }
    },

    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            msg: 'este email ya esta registrado'
        },
        validate: {
            isEmail: {
                msg: 'debe ser un email valido'
            },
            notEmpty: {
                msg: 'el email no puede estar vacio'
            }
        }
    },

    password: {
        type: DataTypes.STRING(255), // cadena larga para el hash
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'la contraseña no puede estar vacia'
            },
            len: {
                args: [6, 255],
                msg: 'la contraseña debe tener al menos 6 caracteres'
            }
        }
    },
//rol del usuaroi(cliente, auxiliar o admin)
    rol: {
        type: DataTypes.ENUM('cliente', 'auxiliar', 'admin'), //tres roles disponibles
        allowNull: false,
        defaultValue: 'cliente',// por defecto es cliente
        validate: {
            isIn: {
                args: [['cliente', 'auxiliar', 'admin']],
                msg: 'el rol debe ser cliente, auxiliar o admin'
            }
        }
    },
// telefono del usuario obcional
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true, //es obcional
        validate: {
            is: {
                args: /^[0-9+\-\s()]*$/, // solo numeros, espacios, guiones y parentesis
                msg: 'el telefono debe contener solo numeros y caracteres validos'
            }
        }
    },

    /**
     * direccion del usuario es opcional 
     */
    direccion: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    /**
     * activo estado del usuario
     */
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true //por defecto activo
    }

}, {
    //opciones del modelo

    tableName: 'usuarios',
    timestamps: true, //crea campos createdAt y updatedAt

    /**
     * scopes consultas predefinidas 
     */

    defaultScope: {
        /**
         * por defecto excluir el password de todas las consultas
         */
        attributes: { exclude: ['password'] }
    },
    scopes: {
        //scope para incluir el password cuando sea necesario (ejemplo en login)
        withPassword: {
            attributes: {}// incluir todos los atrubutos
        }
    },

    /**
     * hooks funciones que se ejecutan en ciertos momentos especificos
     */
    hooks: {
        /**
         * beforeCreate se ejecuta antes de crear un usuario
         * encripta la contraseña antes de guardarla en la base de datos
         */

        beforeCreate: async (usuario) => {
            if(usuario.password) {
                //generar un salt (semilla aleatoria) con factor de costo 10
                const salt = await bcrypt.genSalt(10);
                //encriptar la contraseña con salt
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        },
        /** 
         * beforeUpdate se ejecuta antes de actualizar un usuario
         * encripta la contraseña si fue modificada
        */
        beforeUpdate: async (usuario) => {
            //verificar si la contraseña fue modificada
            if (usuario.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        }
    }
});

//metodo de instancia 
/**
 * metodo para comparar contraseñas
 * compara una contraseña en texto pano con el hash guardado
 * @param {string} passwordIngresado contraseña en texto pano
 * @returns{Promise<boolean>} true si coinciden, false si no
 */
usuario.prototype.compararPassword = async function (passwordIngresado) {
    return await bcrypt.compare(passwordIngresado, this.password);
};

/**
 * metodo para obtener datos publicos del usuario (sin contraseña)
 * 
 * @returns {object} objetos con datos publicos del usuario
 */
usuario.prototype.toJSON = function () {
    const valores = Object.assign({}, this.get());

    //eliminar la contraseña del objeto 
    delete valores.password;
    return valores;
};

//exportar modelo categoria
module.exports = usuario;