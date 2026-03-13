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
         * beforeCreate - se ejecuta antes de crear un item en el carrito
         * valida que este esta activo y teenga stock suficiente 
         */
        beforeCreate: async (itemCarrito) => {
            const Producto = require('./producto');

            //buscar el producto 
            const producto = await Producto.findByPk(itemCarrito.productoIdId);

            if (!producto) {
                throw new Error('el producto no existe');
            }

            if (!producto.activo) {
                throw new Error('no se puede agregar un producto inactivo al carrito');
            }

            if (!producto.haystock(itemCarrito.cantidad)) {
                throw new Error(`stock insuficiente, solo hay: ${producto.stock} unidades disponibles`);
            }

            //guardar el precio actual del producto
            itemCarrito.precioUnitario = Producto.precio
        },

        /**
         * afterUpdate - se ejecuta antes de actualizar una carrito
         * valida que haya stock suficiente si se aumenta la cantidad
         */
        beforeUpdate: async (itemCarrito) => {

            if (itemCarrito.changed('cantidad')) {
                const Producto = require('./producto');
                const producto = await Producto.findByPk(itemCarrito.productoId);

                if (!producto) {
                    throw new Error('el producto no existe');
                }

                if (!producto.haystock(itemCarrito.cantidad)) {
                    throw new Error(`stock insuficiente, solo hay: ${producto.stock} unidades disponibles`);
                }
            }
        }
    }
});

//metodo de instancia 
/**
 * metodo para calcular el subtotal de este item
 * 
 * @returns {number} - subtotal = precio * cantidad
 */
carrito.prototype.calcularSubtotal = function() {
    return parseFloat(this.precioUnitario) * this.cantidad;
};

/**
 * metodo para actualizar la cantidad
 * @param {number} nuevaCantidad - nueva cantidad a actualizar
 * @returns {Promise} item acutualizado *
*/
carrito.prototype.actualizarCantidad = async function(nuevaCantidad) {
    const Producto = require('./producto');

    const producto = await Producto.findByPk(this.productoId);

    if (!producto.haystock(nuevaCantidad)) {
        throw new Error(`stock insuficiente, solo hay: ${producto.stock} unidades disponibles`);
    }

    this.cantidad = nuevaCantidad;
    return await this.save();
};

/**
 * metodo para obtener el carrito completo de un usuario
 * inlcuye informacion de los productos
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} - items del carrito con productos asociados
 */
carrito.obtenerCarritoUsuario = async function(usuarioId) {
    const Producto = require('./producto');

    return await this.findAll({
        where: { usuarioId },
        include: [
            {
                model: Producto,
                as: 'producto',
            }
        ],
        order: [['createdAt', 'DESC']]
    });
};

/**
 * metodo para calcular el total del carrito de un usuario
 * @param {number} usuarioId id del usuario
 * @returns {promise<number>} total del carrito
 */
carrito.calcularTotalCarrito = async function(usuarioId) {
    const items = await this.findAll({
        where: {usuarioId}
    });

    let total = 0;
    for (const item of items) {
        total += item.calcularSubtotal();
    }
    return total;
};

/**
 * metodo para vaciar el carrito de un usuario
 * util despues de realizar un pedido
 * @param {number} usuarioId - id del usuario
 * @returns {Promise<number>} - numero de items eliminados
 */
carrito.vaciarCarrito = async function(usuarioId) {
    return await this.destroy({
        where: {usuarioId}
    });
};

//exportar modelo 
module.exports = carrito;

