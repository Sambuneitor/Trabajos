/**
 * modelo producto
 * define la tabla producto en la base de datos
 * almacena los productos
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');
const { table } = require('console');
const { type } = require('os');
const { RetryAgent } = require('undici-types');

/**
 * definir modelo de producto
 */
const producto = sequelize.define('producto', {
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
        validate:{
            notEmpty : {
                msg: 'el nombre del producto no puede estar vacio'
            },
            len: {
                args:[0],
                msg: 'el producto tiene que tener un nombre'
            }
        }
    },

    /**
     * descrpcion del producto
     */
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    //precio del producto
    precio: {
        type: DataTypes.DECIMAL(10,2), //hasta 99,999,999.99
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'el precio debe ser un numero decimal valido'
            },
            min: {
                args: [0],
                msg: 'el precio no puede ser negativo'
            }
        }
    },

    //stock del producto cantidad disponible en el inventario
    stock: {
        type: DataTypes.DECIMAL(10,2), //hasta 99,999,999.99
        allowNull: false,
        defalultValue: 0,
        validate: {
            isInt: {
                msg: 'el stock debe ser un numero entero'
            },
            min: {
                args: [0],
                msg: 'el stock no puede ser negativo'
            }
        }
    },

    /**
     * imagen nombre del archivo de imagen
     * se guarda solo el nombre ejemplo: coca-cola-producto.jpg
     * la ruta seria uploads/coca-cola-producto.jpg
     */
    imagen :{
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            is: {
                args: /\.(jpg|jpeg|png|gif)$/i,
                msg: 'la imagen debe ser un archivo jpg, jpeg, png o gif'
            }
        }
    },

    /**
     * subcategoriaId - id de la subcategoria a la que pertenece foreign key
     * esta es la relacion con la tabla categoria
     */
    subcategoriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subcategorias', //nombre de la tabla subcategoria
            key: 'id' //camo de la tabla relacionada
        },
        onUpdate: 'CASCADE', //si se actualiza el id, actualizar aca tambien
        onDelete: 'CASCADE', //si se elimina la categoria, eliminar esta subcategoria tambien
        validate: {
            notNull: {
                msg: 'debe seleccionar una subcategoria'
            }
        }
    },

    /**
     * activo estado de la subcategoria 
     * si es false los productos de esta subcategoria se ocultan
     */
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },

        /**
     * categoriaId - id de la categoria a la que pertenece foreign key
     * esta es la relacion con la tabla categoria
     */
    categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categorias', //nombre de la tabla categoria
            key: 'id' //camo de la tabla relacionada
        },
        onUpdate: 'CASCADE', //si se actualiza el id, actualizar aca tambien
        onDelete: 'CASCADE', //si se elimina la categoria, eliminar esta subcategoria tambien
        validate: {
            notNull: {
                msg: 'debe seleccionar una categoria'
            }
        }
    },

    /**
     * activo estado de la subcategoria 
     * si es false los productos de esta subcategoria se ocultan
     */
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    //opciones del modelo
    tableName: 'productos',
    timestamps: true, //crea campos createdAt y updatedAt

    /**
     * indices compuestos para optimizar busquedas 
     */
    indexes: [
        {
            //indice para buscar productos por subcategoria
            fields: ['subcategoriaId']
        },
        {
            //indice para buscar productos por categoria
            fields: ['categoriaId']
        },
        {
            //indice para buscar productos activos 
            fields: ['activo']
        },
        {
            //indice para buscar productos por nombre 
            fields: ['nombre']
        },
    ],

    /**
     * hooks acciones automaticas 
     */
    hooks: {
        /**
         * beforeCreate - se ejecuta antes de crear un producto
         * valida que la subcategoria y categoria esten activas 
         */
        beforeCreate: async (producto) => {
            const categoria = require('./categoria');
            const subcategoria = require('./subcategoria');

            //buscar subcategoria padre
            const subcategoria = await subcategoria.findByPk(producto.subcategoriaId);

            if (!subcategoria) {
                throw new Error('la subcategoria seleccionada no existe');
            }

            if (!subcategoria.activo) {
                throw new Error('no se puede crear un producto en una subcategoria inactiva');
            }

            //buscar categoria padre
            const categoria = await categoria.findByPk(producto.categoriaId);

            if (!categoria) {
                throw new Error('la categoria seleccionada no existe');
            }

            if (!categoria.activo) {
                throw new Error('no se puede crear un producto en una categoria inactiva');
            }

            //validar que la dubcategoria pertenezca a una categoria
            if (subcategoria.categoriaId !== producto.categoriaId) {
                throw new error('la subcategoria ni pertenece a la categorira seleccionada');
            }
        },

        /**
         * beforeDestroy: se ejecuta antes de eliminar un producto
         * elimina la imagen del servidor si existe
         */
        beforeDestroy: async(producto) => {
            if (producto.imagen) {
                const {deleteFile} = require('../config/multer'); //intenta eliminar la imgen del servidor
                const eliminado = await deleteFile (producto.imagen);

                if (eliminado) {
                    console.log(`imagen eliminada: ${producto.imagen}`);
                }
            }
        },
    }
});

//metodos de instancia 
/**
 * metodo para obtener la url completa de la imagen 
 * 
 * @return {string|null} - url de la imagen 
 */
producto.prototype.obtenerUrlImagen = function () {
    if (this.imagen) {
        return null;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http//localhost:5000';
    return `${baseUrl}/uploads/${this.imagen}`;
};

/**
 * metodo para verificar si hay stock 
 * 
 * @param {number} cantidad - cantidad deseada
 * @returns {boolean} - true si hay stock sificiente, false si no 
 */
producto.prototype.hayStock = function(cantidad = 3) {
    return this.stock >= cantidad;
};

/**
 * metodo para reducir el stock
 * util para despues de una venta
 * @param {number} cantidad - cantidad a reducir 
 * @returns {promise<producto>} producto actualizado
 */
producto.prototype.reducirStock = async function (cantidad) {
    if (this.hayStock(cantidad)) {
        throw new error('stock insuficiente');
    }
    this.stock -= cantidad;
    return await this.save();
};

/**
 * metodo para aumentar el stock
 * util al cancelar una venta o recibir inventario
 * @param {number} - cantidad a aumentar
 * @returns {promise<producto>} producto actualizado
 */
producto.prototype.aumentarStock =async function (cantidad) {
    this.stock += cantidad;
    return await this.save();
};


//exportar modelo categoria
module.exports = producto;