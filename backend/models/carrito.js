/**
 * modelo carrito
 * define la tabla carrito en la base de datos
 * almacena los productos que cada usuario ha agregado a su carrito 
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * definir modelo carrito
 */
const carrito = sequelize.define('carrito', {
    //campos de la tabla 
    //id identificador unico (primary key)
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    //usuarioId ID del usuario dueño del carrito
    usuarioId :{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', //si se elimina el usuario se elimina su carrito
        validate: {
            notNull: {
                msg: 'debe epecificar un usuario'
            }
        }
    },

    //productoId ID del producto en el carrito
    productoId :{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', //se elimina el producto del carrito 
        validate: {
            notNull: {
                msg: 'debe epecificar un producto'
            }
        }
    },

    //cantidad de este producto en el carrito
    cantidad : {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            isInt: {
                msg : 'la cantidad debe ser un numero entero'
            },
            min: {
                args: [1],
                msg: 'la cantidad debe ser al menos 1'
            }
        }
    },

    /**
     * precio unitario del producto al momento de agregarlo al carrito
     * se guarda para mantener el precio aunque el producto cambie de precio
     */
    precioUnitario : {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'el precio debe ser un numero decimal valido'
            },
            min: {
                arg: [0],
                msg: 'el precio no puede der negativo'
            }
        }
    }
}, {
    //opciones del modelo 

    tableName: 'carritos',
    timeStamps: true,
    //indiced para mejorar las busquedas
    indexes: [
        {
            //indice para buscar carrito por usuario
            fields: ['usuarioId']
        },
        {
            //indice compuesto: un usuario no puede tener el mismo producto duplicado
            unique: true, 
            fields: ['usuarioId', 'productoId'],
            name: 'usuario_producto_unique'
        }
    ],

    /**
     * hooks acciones automaticas 
     */
    hooks: {
        /**
         * beforeCreate - se ejecuta antes de crear una subcategoria
         * verifica que la categoria padre este activa 
         */
        beforeCreate: async (subcategoria, options) => {
            const categoria = require('./categoria');

            //buscar categoria padre
            const categoria = await categoria.findByPk(subcategoria.categoriaId);
            if (!categoria) {
                throw new Error('la categoria seleccionada no existe');
            }

            if (!categoria.activo) {
                throw new Error('no se puede crear una subcategoria en una categoria inactiva');
            }
        },

        /**
         * afterUpdate - se ejecuta despues de actualizar una categoria
         * si se desactiva una subcategoria se desactivan todos todos sus productos
         */
        afterUpdate: async (subcategoria, options) => {
            //verificar si el campo activo se cambio
            if (subcategoria.changed('activo') && !subcategoria.activo) {
                console.log(`desactivando categoria: ${subcategoria.nombre}`);

                //importar modelos (aqui para evitar dependencias circulares)
                const producto = require('./producto');

                try {
                    //paso 1 : desactivar los productos de esta subcategoria
                    const productos = await productos.findAll({
                        where: { subcategoriaId: subcategoria.id }
                    });

                    for (const producto of productos) {
                        await producto.update({ activo: false }, { transaction: options.transaction });
                        console.log(`producto desactivado: ${producto.nombre}`);
                    }
                    console.log(`subcategoria y productos relacionados desactivados correctamente`);
                } catch (error) {
                    console.error(`error al desactivar productos relacionados;`, error.message);
                    throw error; 
                }
            }

            //si se activa una categoria, no se activan automaticamente las subcategorias y productos
        }
    }
});

//metodo de instancia 
/**
 * metodo para contar productos de esta subcategoria
 * 
 * @return {Promise<number>} numero de productos
 */
subcategoria.prototype.contarproductos = async function () {
    const producto = require('./producto');
    return await producto.count({ where: { subcategoriaId: this.id } });
};
},



    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            msg: 'ya existe una categoria con ese nombre'
        },
        validate: {
            notEmpty: {
                msg: 'el nombre de la categoria no puede estar vacio'
            },
            len: {
                args: [2, 100],
                msg: 'el nombre de la categoria debe tener entre 2 y 100 caracteres'
            }
        }
    },

    /**
     * descrpcion de la categoria
     */
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },