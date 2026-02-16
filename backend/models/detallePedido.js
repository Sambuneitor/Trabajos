/**
 * modelo detallePedido
 * define la tabla detallePedido en la base de datos
 * almacena los productos incluidos en cada pedido
 * relacion muchos a muchos entre pedidos y productos 
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');
const { parse } = require('path');


/**
 * definir modelo detalle de pedido
 */
const detallePedido = sequelize.define('detallePedido', {
    //campos de la tabla 
    //id identificador unico (primary key)
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    //pedidoId ID del pedido al que pertenece este detalle
    pedidoId :{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pedidos',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', //si se elimina el pedido se elimina los detalles
        validate: {
            notNull: {
                msg: 'debe epecificar un pedido'
            }
        }
    },

    //productoId ID del producto incluido en el producto
    productoId :{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', //no se puede eliminar productos con pedidos  
        validate: {
            notNull: {
                msg: 'debe epecificar un producto'
            }
        }
    },

    //cantidad de este producto en el pedido
    cantidad : {
        type: DataTypes.INTEGER,
        allowNull: false,
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
     * precio unitario del producto al momento de agregarlo
     * se guarda para mantener el historial aunque el producto cambie de precio
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
    },

    /**
     * subtotal total de este item (precio * cantidad)
     * se calcula auto antes de guardar
     */
    subtotal : {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'el subtotal debe ser un numero decimal valido'
            },
            min: {
                args: [0],
                msg: ' el subtotal no puede ser negativo'
            }
        }
    }
}, {
    //opciones del modelo 

    tableName: 'detalle_pedidos',
    timeStamps: false, //no necesita createdAt/updatedAt
    //indiced para mejorar las busquedas
    indexes: [
        {
            //indice para buscar detalles por pedido
            fields: ['pedidoId']
        },
        {
            //indice para buscar detalles por producto
            fields: ['productoId']
        },
    ],

    /**
     * hooks acciones automaticas 
     */

    hooks: {
        /**
         * beforeCreate - se ejecuta antes de crear un detalle de pedido
         * calcula el subtotal auto
         */
        beforeCreate: (detalle) => {
            //calcular subtotal precio * cantidad
            detalle.subtotal = parseFloat(detalle.precioUnitario) * detalle.cantidad;
        },
        /**
         * afterUpdate - se ejecuta antes de actualizar detalle de pedido
         * recalcula el subtotal si cambio el precio o cantidad
         */
        beforeUpdate: (detalle) => {
            if (detalle.changed('precioUnitario') || detalle.changed('cantidad')) {
                detalle.subtotal = parseFloat(detalle.precioUnitario) * detalle.cantidad;

            }
        }
    }
});

//metodo de instancia 
/**
 * metodo para calcular el subtotal
 * 
 * @returns {number} - subtotal calcaulado
 */
detallePedido.prototype.calcularSubtotal = function() {
    return parseFloat(this.precioUnitario) * this.cantidad;
};

/**
 * metodo para crear detalles del pedido desde el carrito
 * convierte los items del carrito en detalles de pedido
 * @param {number} pedidoId - id del pedido
 * @param {Array} itemsCarrito - items del carrito
 * @returns {Promise<Array>} detalles del pedido creados
*/
detallePedido.crearDesdeCarrito = async function(pedidoId, itemsCarrito) {
    const detalles = [];

    for (const item of itemsCarrito) {
        const detalle = await this.create({
            pedidoId: pedidoId,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario
        });
        detalles.push(detalle);
    }
    return detalles;
};

/**
 * metodo para calcular el total de un pedido desde sus detalles
 * inlcuye informacion de los productos
 * @param {number} pedidoId - ID del pedido
 * @returns {Promise<number>} - total calculado
 */
detallePedido.calcularTotalPedido = async function(pedidoId) {
    const detalles = await this.findAll({
        where: {pedidoId},
    });

    let total = 0;
    for (const detalle of detalles) {
        total += parseFloat(detalle.subtotal);
    }
    return total;
};

/**
 * metodo para obtener resumen de productos mas vendidos
 * @param {number} limite - numero de productos a retornar
 * @returns {promise<Array>} productos mas vendidos
 */
detallePedido.obtenerMasVendidos = async function(limite = 10) {
    const { sequelize } = require('../config/database');

    return await this.findAll({
        attributes: [
            'productoId',
            [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalVendido']
        ],
        group: ['productoId'],
        order: [[sequelize.fn('SUM', sequelize.col('cantidad')), 'DESC']],
        limit: limite
    });
};

//exportar modelo 
module.exports = detallePedido;

