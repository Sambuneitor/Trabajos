/**
 * modelo pedido
 * define la tabla pedido en la base de datos
 * almacena la informacion de los pedidos realizados por los usuarios
 */

//importar datatypes de sequelize
const { DataTypes } = require('sequelize');

//importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * definir modelo de pedido
 */
const pedido = sequelize.define('pedido', {
    //campos de la tabla 
    //id identificador unico (primary key)
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    //usuarioId ID del usuario que realizo el pedido
    usuarioId :{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', // no se puede eliminar un usuario con pedidos
        validate: {
            notNull: {
                msg: 'debe epecificar un usuario'
            }
        }
    },

    // total monto total del pedido
    total: {
        typra: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'el total debe ser unn numero decimal valido'
            },
            min: {
                args: [0],
                msg: 'el total no puede ser negativo'
            }
        }
    },

    /**
     * estado - estado actual del pedido
     * valores posibles:
     * pendiente: pedido creado esperando pago
     * pagado: pedido pagado en preparacion
     * enviado: pedido enviado al cliente
     * cancelado: pedido cancelado
     */
    estado: {
        type: DataTypes.ENUM('pendiente', 'pagado', 'enviado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendiente',
        validate: {
            isIn: {
                args: [['pendiente', 'pagado', 'enviado', 'cancelado']],
            }
        }
    },

    //productoId ID del producto en el pedido
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

    //direccion de envio del pedido
    direccionEnvio:{
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'la direccion de envio es obligatoria'
            }
        }
    },

    //telefono de contacto para el envio
    telefonoContacto: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'el telefono es obligatorio'
            }
        }
    },

    //notas adicionales del pedido(opcional)
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    //fecha de pago
    fechaPago: {
        type: DataTypes.DATE,
        allowNull: true
    },

    //fecha de envio
    fechaEnvio: {
        type: DataTypes.DATE,
        allowNull: true
    },

    //fecha de entrega
    fechaEntrega: {
        type: DataTypes.DATE,
        allowNull: true
    },
}, {
    //opciones del modelo 
    tableName: 'pedidos',
    timeStamps: true,
    //indiced para mejorar las busquedas
    indexes: [
        {
            //indice para buscar carrito por usuario
            fields: ['usuarioId']
        },
        {
            //indice para buscar pedidos por estado
            fields: ['estado']
        },
        {
            //indice para buscar pedidos por fecha
            fields: ['createdAt']
        },
    ],

    /**
     * hooks acciones automaticas 
     */

    hooks: {
        /**
         * beforeCreate - se ejecuta antes de crear un item en el carrito
         * valida que este esta activo y teenga stock suficiente 
        
        beforeCreate: async (itemCarrito) => {
            const producto = require('./producto');
            //buscar el producto 
            const producto = await producto.findByPk(itemCarrito.productoIdId);
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
            itemCarrito.precioUnitario = producto.precio
        },*/

        /**
         * afterUpdate - se ejecuta despues de actualizar un pedido
         * acualiza las fechas segun el estado
         */
        afterUpdate: async (pedido) => {
            //si es estado cambio a pagado guarda la fecha del pago
            if (pedido.changed('estado') && pedido.estado === 'pagado') {
                pedido.fechaPago = new Date();
                await pedido.save({hooks: false}); //guardar sin ejecutar hooks
            }
            //si el estado cambio a enviado guarda la fecha de envio
            if (pedido.changed('estado') && pedido.estado === 'enviado' && !pedido.fechaEnvio) {
                pedido.fechaEnvio = new Date();
                await pedido.save({hooks: false}); //guardar sin ejecutar hooks
            }
            //si el estado cambio a entregado guarda la fecha de entrega
            if (pedido.changed('estado') && pedido.estado === 'entregado' && !pedido.fechaEntrega) {
                pedido.fechaEntrega = new Date();
                await pedido.save({hooks: false}); //guardar sin ejecutar hooks
            }
        },

        /**
         * beforeDestroy: se ejecuta antes de eliminar un pedido
        */
        beforeDestroy: async () => {
            throw new Error('no se pueden eliminar los pedidos, use el estado cancelado en su lugar');
        }
    }
});

//metodo de instancia 
/**
 * metodo para cambiar el estado del pedido
 * 
 * @param {string} nuevoEstado - nuevo estado del pedido
 * @returns {number} - subtotal = precio * cantidad
 */

pedido.prototype.cambiarEstado = async function(nuevoEstado) {
    const estadosValidos = ['pendiente', 'pagado', 'enviado', 'cancelado'];

    if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error(`estado invalido`)
    }

    this.estado = nuevoEstado;
    return await this.save();
};

/**
 * metodo para verificar si el pedido puedeser cancelado
 * solo se puedio cancelar si esta en estadio pendiente o pagado
 * @returns {boolean} true si puede cancelarce, false en caso contrario
 */

pedido.prototype.puedeSerCancelado = function () {
    return ['pendiente', 'pagado'].includes(this.estado);
};

/**
 * metodo para cancelar pedido
 * @returns {Promise<pedido>} pedido cancelado
*/
pedido.prototype.cancelar = async function() {
    if (!this.puedeSerCancelado()) {
        throw new Error(`este pedido no puede ser cancelado`);
    }

    //importar modelos
    const detallePedido = require('./detallePedido');
    const producto = require('./producto');

    //obtener detalles del pedido
    const detalles = await detallePedido.findAll({
        where: {pedidoId: this.id}
    });

    //devolver el stock de cada producto
    for (const detalle of detalles) {
        const producto = await producto.findByPk(detalle.productoId);
        if (producto) {
            await producto.aumentarStock(detalle.cantidad);
            console.log(`stock devuelto ${detalle.cantidad} x ${producto.nombre}`);
        }
    }

    //cambiar estado a cancelado
    this.estado = 'cancelado';
    return await this.save();
};

/**
 * metodo para obtener detalle del pedido con productos
 * @returns {Promise<Array>} - detalle del pedido
 */
pedido.prototype.obtenerDetalle = async function(usuarioId) {
    const detallePedido = require('./detallePedido');
    const producto = require('./producto');

    return await detallePedido.findAll({
        where: {pedidoId: this.id},
        include: [
            {
                model: producto,
                as: 'producto',
            }
        ]
    });
};

/**
 * metodo para obtener pedidos por estado 
 * @param {string} estado estado a filtrar
 * @returns {promise<Array>} pedidos filtrados
 */
pedido.obtenerPorEstado = async function(estado) {
    const usuario = require('./usuario');
    return await this.findAll({
        where: {estado},
        include: [
            {
                model: usuario,
                as: 'usuario',
                attributes: ['id', 'nombre', 'email', 'telefono']
            }
        ],
        order: [['createdAt', 'DESC']]
    });
};

/**
 * metodo para obtener historial de pedidos de un usuario
 * @param {number} usuarioId - id del usuario
 * @returns {Promise<Array>} - pedidos del usuario
 */
pedido.obtenerHistorialUsuario = async function(usuarioId) {
    return await this.findAll({
        where: {usuarioId},
        order: [['createdAt', 'DESC']]
    });
};

//exportar modelo 
module.exports = pedido;

