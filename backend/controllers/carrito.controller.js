/**
 * controlador de carrito de compras
 * gestion de carrto
 * require autenticacion
 */

//importar modelos
const carrito = require('../models/carrito');
const producto = require('../models/producto');
const categoria = require('../models/categoria');
const subcategoria = require('../models/subcategoria');

/**
 * obtener carrito del usuario autenticado
 * GET /api/carrito
 * @param {Object} req requestt de express con req.usuario del middleware
 * @param {Object} res response de express
 */
const getCarrito = async (req, res) => {
    try {
        //obtener items del carrito con los productos relacionados
        const itemsCarrito = await carrito.findAll({
            where: { usuarioId: req.usuario.id },
            include: [
                {
                    model: producto,
                    as:'producto',
                    attrubutes: ['id', 'nombre', 'desctupcion', 'precio', 'stock', 'imagen', 'activo'],
                    include: [
                        {
                            model: categoria,
                            as: 'categoria',
                            attrubutes: ['id', 'nombre']
                        },
                        {
                            model: subcategoria,
                            as: 'subcategoria',
                            attrubutes: ['id', 'nombre']
                        },
                    ]
                }
            ],
            order: [['createAt', 'DESC']]
        });

        //calcular el total del carrito
        let total = 0;
        itemsCarrito.forEach(item => {
            total += parseFloat(item.precioUnitario) * itemCantidad;
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                items: itemsCarrito,
                resumen: {
                    totalItems: itemsCarrito.length,
                    cantidadTotal: itemsCarrito.reduce((sum, item) => sum + item.cantidad, 0),
                    total: total.toFixed(2)
                }
            }
        });
    } catch (error) {
        console.error('error en getCarrito', error);
        res.status(500).json({
            success: false,
            message: 'error al obtener carrito',
            error: error.message
        });
    }
};

/**
 * agregar producto a carrito
 * POST /api/carrito
 * @param {Object} req request express
 * @param {Object} res response express
 */
const agregarAlCarrito = async (req, res) => {
    try {
        const { productoId, cantidad=1 } = req.body;
        //validacion 1: campos requeriddos
        if (!productoId) {
            return res.status(400).json({
                success: false,
                message: 'el productoId es requerido'
            });
        }

        //validacion 2: cantidad valida
        const cantidadNum = parseInt(cantidad);
        if (cantidadNum < 1) {
            return res.status(400).json({
                success: false,
                message: 'la cantidad debe ser al menos 1'
            });
        }

        //validacion 3: producto existe y esta activo
        const producto = await producto.findByPk(productoId);
        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        if(!producto.activo) {
            return res.status(400).json({
                success: false,
                message: 'el producto no esta disponible'
            });
        }

        //validacion 4: verificar si ya existe en el carrito
        const itemExistente = await carrito.findOne({
            where: {
                usuarioId: req.usuario.id,
                productoId
            }
        });

        if(itemExistente) {
            //actualizar cantidad
            const nuevaCantidad = itemExistente.cantidad + cantidadNum;

            //validar stock disponible
            if (nuevaCantidad > producto.stock) {
                return res.status(400).json({
                    success: false,
                    message: `stock insuficiente. disponible: ${producto.stock}, en carrito: ${itemExistente.cantidad}`
                });
            }

            itemExistente.cantidad = nuevaCantidad;
            await itemExistente.save();

            //recargar producto
            await itemExistente.reload({
                include: [{
                    model: producto,
                    as: 'producto',
                    attrubutes: ['id', 'nombre', 'precio', 'stock', 'imagen']
                }]
            });

            return res.json({
                success: true,
                message: 'cantidad actualizada en el carrito',
                data: {
                    item: itemExistente
                }
            });
        }

        //validacion 5: stock disponible
        if (cantidadNum > producto.stock) {
            return res.status(400).json({
                success: false,
                message: `stock insuficiente. disponible: ${producto.stock}`
            });
        }

        //crear un nuevo item en el carrito
        const nuevoItem = await carrito.create({
            usuarioId: req.usuario.id,
            productoId,
            cantidad: cantidadNum,
            precioUnitario: producto.precio
        });

        //recargar con producto
        await nuevoItem.reload({
            include: [{
                model: producto,
                as: 'producto',
                attrubutes: ['id', 'nombre', 'precio', 'stock', 'imagen']
            }]
        });

        //respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'producto agregado al carrito',
            data: {
                item: nuevoItem
            }
        });

    } catch (error) {
        console.error('error en agregarAlCarrito', error);
        res.status(500).json({
            success: false,
            message: 'error al agragar producto al carrito',
            error: error.message
        });
    }
};

/**
 * actualizar cantidad de item del carrito
 * PUT /api/carrito/:id
 * body: {cantidad}
 * @param {Object} req request express
 * @param {Object} res response express
 */
const actualizarItemCarrito = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;

        //validar cantidad
        const cantidadNum = parseInt(cantidad);
        if (cantidadNum < 1) {
            return res.status(400).json({
                success: false,
                message: 'la cantidad debe ser al menos 1'
            });
        }

        //buscar item del carrito
        const item = await carrito.findOne({
            where: {
                id,
                usuarioId: req.usuario.id //solo puede modificar su propio carrito
            },
            include: [{
                model: producto,
                as: 'producto',
                attrubutes: ['id', 'nombre', 'precio', 'stock']
            }]
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'item del carrito no encontrado'
            });
        }
        //validar stock disponible
        if (cantidadNum > item.producto.stock) {
            return res.status(400).json({
                success: false,
                message: `stock insuficiente. disponible: ${item.producto.stock}`
            });
        }

        //actualizar cantidad
        item.cantidad = cantidadNum;
        await item.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'cantidad actualizada',
            data: {
                item
            }
        });

    } catch (error) {
        console.error('error en actualizarItemCarrito', error);
        return res.status(500).json({
            success: false,
            message: 'error al actualizar item del carrito',
            error: error.message
        });
    }
};

/**
 * eliminar item del carrito
 * DELETE /api/carrito/:id
 */

const eliminarItemCarrito = async (req, res) => {
    try {
        const { id } = req.params;

        //buscar item
        const item = await carrito.findOne({
            where: {
                id,
                usuarioId: req.usuario.id
            }
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'item no encontrado en el carrito'
            });
        }

        //eliminar 
        await item.destroy();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'item eliminado del carrito'
        });

    } catch (error) {
        console.error('error en eliminarItemCarrito', error);
        return res.status(500).json({
            success: false,
            message: 'error al eliminar item del carrito',
            error: error.message
        });
    }
};

/**
 * vaciar todo el carrito
 * DELETE /api/carrito/vaciar
 *
 */

const vaciarCarrito = async (req, res) => {
    try {
        //eliminar todos los items del usuario
        const itemsEliminados = await carrito.destroy({
            where: { usuarioId: req.usuario.id }
        });

        res.json({
            success: true,
            message: 'carrito vaciado',
            data: {
                itemsEliminados
            }
        });

    } catch (error) {
        console.error('error en vaciarCarrito', error);
        return res.status(500).json({
            success: false,
            message: 'error al vaciar carrito',
            error: error.message
        });
    }
};

//exportar controladores
module.exports = {
    getCarrito,
    agregarAlCarrito,
    actualizarItemCarrito,
    eliminarItemCarrito,
    vaciarCarrito
}