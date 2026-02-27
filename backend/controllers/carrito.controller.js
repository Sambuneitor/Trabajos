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
                    attrubutes: ['id', 'nombre', 'desctupcion', 'precio', 'stock', 'imegen', 'activo'],
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
        let totalCarrito = 0;
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
                    totalCarrito: total.toFixed(2)
                }
            }
        });
    } catch (error) {
        
    }
};