/**
 * controlador de pedidos 
 * gestion de pedidos
 * requiere autenticacion
 */
//importar modelos
const Pedido = require('../models/pedido');
const DetallePedido = require('../models/detallePedido');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');
const Usuario = require('../models/usuario');
const Categoria = require('../models/categoria');
const Subcategoria = require('../models/subcategoria');

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

        const itemsCarrito = await Carrito.findAll({
            where: { usuarioId: req.usuario.id },
            include: [{
                model: Producto,
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

        //verificar stock y productos activos
        const erroresValidation = [];
        let totalPedido = 0;

        for (const item of itemsCarrito) {
            const producto = item.producto;

            //verificar que el producto este activo
            if (!producto.activo) {
                erroresValidation.push(`${producto.nombre} ya no esta disponible`);
                continue;
            }

            //verificar stock suficiente
            if (item.cantidad > producto.stock) {
                erroresValidation.push(`${producto.nombre}: stock insuficiente (disponible: ${producto.stock}, solicitado: ${item.cantidad})`);
                continue;
            }

            //calcular total
            totalPedido += parseFloat(item.precioUnitario) * item.cantidad;
        }

        //si hay errores de validacion retornar
        if (erroresValidation.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'error en validacion de carrito',
                errores: erroresValidation
            });
        }

        //crear pedido
        const pedido = await Pedido.create({
            usuarioId: req.usuario.id,
            total: totalPedido,
            estado: 'pendiente',
            direccionEnvio,
            telefonoContacto: telefono,
            metodoPago,
            notasAdicionales
        }, { transaction: t });

        //crear detalles del pedido y actualizar stock

        const detallesPedido = [];

        for (const item of itemsCarrito) {
            const producto = item.producto;
            
            //crear detalle
            const detalle = await DetallePedido.create({
                pedidoId: pedido.id,
                productoId: producto.id,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                subtotal: parseFloat(item.precioUnitario) * item.cantidad
            }, { transaction: t });

            detallesPedido.push(detalle);

            //reducir stock del producto
            producto.stock -= item.cantidad;
            await producto.save({ transaction: t });
        }

        //vaciar carrito
        await Carrito.destroy({
            where: { usuarioId: req.usuario.id },
            transaction: t
        });

        //confirmar transaccion
        await t.commit();

        //cargar pedido con relaciones
        await pedido.reload({
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio', 'imagen']
                    }]
                }
            ]
        });

        //respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'el pedido se a creado exitosamente',
            data: {
                pedido
            }
        });

    } catch (error) {
        //revertir transaccion en caso de error
        await t.rollback();
        console.error('error en crearPedido', error);
        return res.status(500).json({
            success: false,
            message: 'error al crear pedido',
            error: error.message
        });
    }
};

/**
 * obtener pedidos del cliente autenticado
 * GET /api/cliente/pedidos
 * query: ?estado=pendiente&pagina=1&limite=10
 */

const getMisPedidos = async(req, res) => {
    try{
        const { estado, pagina = 1, limite = 10 } = req.query;

        //filtros
        const where = { usuarioId: req.usuario.id };
        if (estado) where.estado = estado;

        //paginacion
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        //consultar pedidos
        const { count, rows: pedidos } = await Pedido.findAndCountAll({
            where,
            include: [
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio', 'imagen']
                    }]
                }
            ],
            limit: parseInt(limite),
            offset,
            order: [['createdAt', 'DESC']]
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                pedidos,
                paginacion: {
                    total: count,
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    totalPaginas: Math.ceil(count / parseInt(limite))
                }
            }
        });

    } catch (error) {
        console.error('error en getMisPedidos', error);
        return res.status(500).json({
            success: false,
            message: 'error al obtener los pedidos',
            error: error.message
        });
    }
};

/**
 * obtener un pedido especifico por ID
 * GET /api/cliente/pedidos/:id
 * solo puede ver sus pedidos admin todos
 */

const getPedidoById = async (req, res) => {
    try {
        const { id } = req.params;
        //construir filtros (cliente solo ve sus pedidos admin ve todos)
        const where = { id };
        if (req.usuario.rol !== 'administrador') {
            where.usuarioId = req.usuario.id;
        }

        //buscar pedido
        const pedido = await Pedido.findOne({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio', 'imagen'],
                        include: [
                            {
                                model: Categoria,
                                as: 'categoria',
                                attributes: ['id', 'nombre']
                            },
                            {
                                model: Subcategoria,
                                as: 'subcategoria',
                                attributes: ['id', 'nombre']
                            }
                        ]
                    }]
                }
            ]
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'pedido no encontrado'
            });
        }

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                pedido
            }
        });

    } catch (error) {
        console.error('error en getPedidoById', error);
        return res.status(500).json({
            success: false,
            message: 'error al obtener el pedido',
            error: error.message
        });
    }
};

/**
 * cancelar pedido
 * PUT /api/cliente/pedidos/:id/cancelar
 * solo se puede cancelar si el estado es pendiente 
 * devuelve el stock a los productos 
 */

const cancelarPedido = async (req, res) => {
    const { sequelize } = require('../config/database');
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;

        //buscar pedido solo los propios pedidos
        const pedido = await Pedido.findOne({
            where: {
                id,
                usuarioId: req.usuario.id
            },
            include: [{
                model: DetallePedido,
                as: 'detalles',
                include: [{
                    model: Producto,
                    as: 'producto'
                }]
            }],
            transaction: t
        });

        if (!pedido) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'pedido no encontrado'
            });
        }
        //solo se puede cancelar si esta en pendiente
        if (pedido.estado !== 'pendiente') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `no se puede cancelar un pedido en estado '${pedido.estado}'` 
            });
        }

        //devolver stock de los productos
        for (const detalle of pedido.detalles) {
            const producto = detalle.producto;
            producto.stock += detalle.cantidad;
            await producto.save({ transaction: t });
        }

        //actualizar estado del pedido
        pedido.estado = 'cancelado';
        await pedido.save({ transaction: t });

        await t.commit();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'pedido cancelado exitosamente',
            data: {
                pedido
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('error en cancelarPedido', error);
        return res.status(500).json({
            success: false,
            message: 'error al cancelar el pedido',
            error: error.message
        });
    }
};

/**
 * admin obtener todos los pedidos
 * GET /api/admin/pedidos
 * query ?estado=pendiente&usuarioId=1&pagina=1&limite=10
 */
const getAllPedidos = async (req, res) => {
    try {
        const {estado, usuarioId, pagina = 1, limite = 20} = req.query;

        //filtros
        const where = {};
        if (estado) where.estado = estado;
        if (usuarioId) where.usuarioId = usuarioId;

        //paginacion
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        //consultar pedidos
        const {count, rows: pedidos } = await Pedido.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'imagen']
                    }]
                }
            ],
            limit: parseInt(limite),
            offset,
            order: [['createdAt', 'DESC']]
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                pedidos,
                paginacion: {
                    total: count,
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    totalPaginas: Math.ceil(count / parseInt(limite))
                }
            }
        });

    } catch (error) {
        console.error('error en getAllPedidos', error);
        return res.status(500).json({
            success: false,
            message: 'error al obtener los pedidos',
            error: error.message
        });
    }
};

/**
 * admin actualizar estado del pedido
 * PUT /api/admin/pedidos/:id/estado
 * body: {estado}
 */

const actualizarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        //validar estado
        const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: `estado invalido, opciones: ${estadosValidos.join(', ')}`
            });
        }

        //buscar pedido
        const pedido = await Pedido.findByPk(id);
        if (!pedido) {
            return res.status(404).json({
                success: false,
                message: 'pedido no encontrado'
            });
        }

        //actualizar estado
        pedido.estado = estado;
        await pedido.save();

        //recargar con relaciones
        await pedido.reload({
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nombre', 'email']
                }
            ]
        });

        //respuesta exitosa
        res.json({
            success: true,
            message: 'estado del pedido actualizado',
            data: {
                pedido
            }
        });

    } catch (error) {
        console.error('error en actualizarEstadoPedido', error);
        return res.status(500).json({
            success: false,
            message: 'error al actualizar el estado del pedido',
            error: error.message
        });
    }
};

/**
 * obtener estadisticas de pedidos
 * GET /api/admin/pedidos/estadisticas
 */

const getEstadisticasPedidos = async (req, res) => {
    try {
        const { Op, fn, col } = require('sequelize');

        //total de pedidos
        const totalPedidos = await Pedido.count();

        //pedidos estado
        const pedidosPorEstado = await Pedido.findAll({
            attributes: [
                'estado',
                [fn('COUNT', col('id')), 'cantidad'],
                [fn('SUM', col('total')), 'totalVentas']
            ],
            group: ['estado']
        });

        //total ventas
        const totalVentas = await Pedido.sum('total');

        //pedidos hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const pedidosHoy = await Pedido.count({
            where: {
                createdAt: { [Op.gte]: hoy } //pedidos ultimos 7 dias
            }
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                totalPedidos,
                pedidosHoy,
                ventasTotales: parseFloat(totalVentas || 0).toFixed(2),
                pedidosPorEstado: pedidosPorEstado.map(p => ({
                    estado: p.estado,
                    cantidad: parseInt(p.getDataValue('cantidad')),
                    totalVentas: parseFloat(p.getDataValue('totalVentas') || 0).toFixed(2)
                }))
            }
        });

    } catch (error) {
        console.error('error en getEstadisticasPedidos', error);
        return res.status(500).json({
            success: false,
            message: 'error al obtener las estadisticas',
            error: error.message
        });
    }
};

//exportar controladores
module.exports = {
    //cliente
    crearPedido,
    getMisPedidos,
    getPedidoById, //admin
    cancelarPedido,
    //admin
    getAllPedidos,
    actualizarEstadoPedido,
    getEstadisticasPedidos
};