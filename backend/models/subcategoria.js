/**
 * modelo subcategoria
 * define la tabla subcategoria en la base de datos
 * almacena las subcategorias principales de los productos
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * definir modelo subcategoria
 */
const subcategoria = sequelize.define('subcategoria', {
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
        unique: {
            msg: 'ya existe una subcategoria con ese nombre'
        },
        validate: {
            notEmpty: {
                msg: 'el nombre de la subcategoria no puede estar vacio'
            },
            len: {
                args: [2, 100],
                msg: 'el nombre de la subcategoria debe tener entre 2 y 100 caracteres'
            }
        }
    },

    /**
     * descrpcion de la subcategoria
     */
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
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

    tableName: 'subcategorias',
    timestamps: true, //crea campos createdAt y updatedAt

    /**
     * indices compuestos para optimizar busquedas 
     */
    indexes: [
        {
            //indice para buscar subcategorias por categoria
            fields: ['categoriaId']
        },
        {
            //indice compuesto: nombre unico por categoria
            //permite que dos categorias diferentes tengan subcategorias con el mismo nombre
            unique: true,
            fields: ['nombre', 'categoriaId'],
            name: 'nombre_categoria_unique'
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

/**
 * metoso para obtener la categoria padre
 * 
 * @returns {Promise<Categoria>} categoria padre
 */
subcategoria.prototype.obtenerCategoria = async function () {
    const categoria = require('./categoria');
    return await categoria.findByPk(this.categoriaId);
};

//exportar modelo categoria
module.exports = subcategoria;