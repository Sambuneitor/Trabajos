/**
 * controlador de pedidos 
 * gestion de pedidos
 * requiere autenticacion
 */
//importar modelos
const pedido = require('../models/pedido');
const detallePedido = require('../models/detallePedido');
const carrito = require('../models/carrito');
const producto = require('../models/producto');
const usuario = require('../models/usuario');
const categoria = require('../models/categoria');
const subcategoria = require('../models/subcategoria');

/**
 * crear pedido desde el carrito (checkout)
 * POST /api/cliente/pedidos
 */

const crearPedido = async (req, res) => {
        const { sequelize } = require('../config/database');
        const t = await sequelize.transaction();

    try {
        const { direccionEnvio, telefono, metodoPago = 'efectivo', notasAdicionales } = req.body;

        //validacion 1: direccion requerida
        if (!direccionEnvio || direccionEnvio.trim() === '') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'la direccion de envio es requerida'
            });
        }

        //validacion 2: telefono requerido
        if (!telefono || telefono.trim() === '') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'el telefono es necesario'
            });
        }

        //validacion 3: metodo de pago requerido
        const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
        if (!metodosValidos.includes(metodoPago)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `metodo de pago invalido, opciones: ${metodosValidos.join(', ')}`
            });
        }

        //obtener items del carrito del usuario

        const carritoItems = await carrito.findAll({
            where: { usuarioId: req.user.usuarioId },
            include: [{
                model: producto,
                as: 'producto',
                attributes: ['id', 'nombre', 'precio', 'stock', 'activo']
            }],
            transaction: t
        });

        if (itemsCarrito.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'el carrito esta vacio'
            });
        }

    } catch (error) {
        console.error('error en crearPedido', error);
        return res.status(500).json({
            success: false,
            message: 'error al crear pedido',
            error: error.message
        });
    }
};