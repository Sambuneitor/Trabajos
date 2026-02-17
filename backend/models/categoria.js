/**
 * modelo categoria
 * define la tabla categoria en la base de datos
 * almacena las categorias principales de los productos
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * definir modelo categoria
 */
const categoria = sequelize.define('categoria', {
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

    /**
     * activo estado de la categoria 
     * si es false la categoria y todas sus subcategorias y productos se ocultan
     */
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }

}, {
    //opciones del modelo

    tableName: 'categorias',
    timestamps: true, //crea campos createdAt y updatedAt

    /**
     * hooks acciones automaticas 
     */
    hooks: {
        /**
         * afterUpdate: se ejecuta despues de actualizar una categoria
         * si se desactiva una categoria, se desactivan todas sus subcategorias y productos 
         */
        afterUpdate: async (categoria, options) => {
            //verificar si el campo activo se cambio
            if (categoria.changed('activo') && !categoria.activo) {
                console.log(`desactivando categoria: ${categoria.nombre}`);

                //importar modelos (aqui para evitar dependencias circulares
                const subcategoria = require('./subcategoria');
                const producto = require('./producto');

                try {
                    //paso 1 : desactivar subcategorias de esta categoria
                    const subcategorias = await subcategoria.findAll({
                        where: { categoriaId: categoria.id }
                    });

                    for (const subcategoria of subcategorias) {
                        await subcategoria.update({ activo: false }, { transaction: options.transaction });
                        console.log(`subcategoria desactivada: ${subcategoria.nombre}`);
                    }

                    //paso 2 : desactivar productos de esta categoria
                    const productos = await producto.findAll({
                        where: { categoriaId: categoria.id }
                    });

                    for (const producto of productos) {
                        await producto.update({ activo: false }, { transaction: options.transaction });
                        console.log(`producto desactivada: ${producto.nombre}`);
                    }

                    console.log(`categoria y elementos relacionados desactivados correctamente`);
                } catch (error) {
                    console.error(`error al desactivar elementos relacionados;`, error.message);
                    throw error; 
                }
            }
            //si se activa una categoria, no se activan automaticamente las subcategorias y productos
        }
    }
});

//metodo de instancia 
/**
 * metodo para contar subcategorias de esta categoria
 * 
 * @return {Promise<number>} numero de subcategorias
 */
categoria.prototype.contarSubcategorias = async function () {
    const subcategoria = require('./subcategoria');
    return await subcategoria.count({ where: { categoriaId: this.id } });
};

/**
 * metodo para contar productos de esta categoria
 * 
 * @return {Promise<number>} numero de productos
 */
categoria.prototype.contarproductos = async function () {
    const producto = require('./producto');
    return await producto.count({ where: { categoriaId: this.id } });
};

//exportar modelo categoria
module.exports = categoria;