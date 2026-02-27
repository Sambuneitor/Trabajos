/**
 * controlador de producto
 * maneja las operaciones crud y activar y desactivar productos
 * solo accesible por admins
 */

/**
 * importar modelos 
 */
const producto = require('../models/producto');
const categoria = require('../models/categoria');
const subcategoria = require('../models/subcategoria');

//importar path y ffs para manejo de imagenes
const path = require('path');
const fs = require('fs');

/**
 * obtener todos los productos 
 * query params:
 * categoriaId: id de la categoria para filtrar por categoria
 * subcategoriaId: id de la subcategoria para filtrar por subcategoria
 * activo true/false (filtrar por estado activo o inactivo)
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getProductos = async (req, res) => {
    try {
        const { 
            categoriaId,
            subcategoriaId,
            activo,
            conStock,
            buscar,
            pagina = 1,
            limite = 100
        } = req.query;

        //construir filtros
        const where = {};
        if (categoriaId) where.categoriaId = categoriaId;
        if (subcategoriaId) where.subcategoriaId = subcategoriaId;
        if (activo !== undefined) where.activo = activo == 'true';
        if (conStock == 'true') where.stock = {[require('sequelize').Op.gt]: 0 };

        //paginacion
        const offset = (parseInt(pagina) -1) * parseInt(limite);

        //opciones de consulta
        const opciones = {
            where,
            include: [
                {
                    model: categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                },
                {
                    model: subcategoria,
                    as: 'subcategoria',
                    attributes: ['id', 'nombre']
                }
            ],
            limit: parseInt(limite),
            offset,
            order: [['nombre', 'ACS']]
        };

        //obtener productos y total 
        const { count, rows: productos } = await producto.findAndCountAll(opciones);

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                productos,
                paginacion: {
                    total: count,
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    totalPaginas: Math.ceil(count / parseInt(limite)),
                }
            }
        });

    } catch (error) {
        console.error('error en getProductos:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener productos', error: error.message
        })
    }
};

/**
 * obtener los productos por id
 * GET /api/admin/productos/:id
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getProductosById = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar productos con relacion
        const producto = await producto.findByPk(id, {
            include: [
                {
                    model: categoria,
                    as: 'categorias',
                    attributes: ['id', 'nombre', 'activo']
                },
                {
                    model: subcategoria,
                    as: 'subcategoria',
                    attributes: ['id', 'nombre', 'activo']
                }
            ]
        });

        //filtrar por estado activo si es especifico
        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                producto            
            }
        });

    } catch (error) {
        console.error('error en getProductosById:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener producto', error: error.message
        })
    }
};

/**
 * crear un producto 
 * POST /api/admin/productos
 * @param {Object} req request express
 * @param {Object} res response express  
 */

const crearProducto =async (req, res) => {
    try {
        const {nombre, descripcion, precio, stock, categoriaId, subcategoriaId} = req.body;

        //validcion 1 verificar campos requeridos 
        if (!nombre || !precio || !categoriaId || !subcategoriaId){
            return res.status(400).json({
                success: false,
                message: 'faltan campos requerios nombre, precio, categoriaId y subcategoriaId'
            });
        }
/** 
        //validacion 2 verificar si la categoria existe
        const categoria = await categoria.findByPk(categoriaId);
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: `no existe la categoria con id ${categoriaId}`
            });
        } */

        //validacion 2 verifica si la categoria existe y esta activa
        const categoria = await categoria.findByPk(categoriaId);
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: `no existe una categoria con id: ${categoriaId}`
            });
        }
        if (!categoria.activo) {
            return res.status(400).json({
                success: false,
                message: `la categoria ${categoria.nombre} no esta activa`
            })
        }

        //validacion 3 verificar que la subcategoria existe y pertenece a una categoria
        const subcategoria = await subcategoria.findByPk(subcategoriaId);

        if (!subcategoria) {
            return res.status(404).json({
                success: false,
                message: `no existe una subcategoria con ${subcategoriaId}`
            });
        }

        if (!subcategoria.activo) {
            return res.status(400).json({
                success: false,
                message: `la categoria ${subcategoria.nombre} no esta activa`
            })
        }

        if (!subcategoria.categoriaId !== parseInt(categoriaId)) {
            return res.status(400).json({
                success: false,
                message: `la subcategoria ${subcategoriaId} no pertenece a la categoria con id ${categoriaId}`
            });
        }

        //validacion 4 precio y stock
        if (parseFloat(precio) < 0) {
            return res.status(400).json({
                success: false,
                message: 'el precio debe ser mayor a 0'
            });
        }

        if (parseInt(stock) < 0) {
            return res.status(400).json({
                success: false,
                message: 'el stock no debe ser negativo'
            });
        }

        //obtener imagen 
        const imagen = req.file ? req.file.filename : null;

        //crear producto
        const nuevoProducto = await producto.create({
            nombre,
            descripcion: descripcion || null, 
            precio: parseFloat(precio),
            stock: parseInt(stock),
            categoriaId: parseInt(categoriaId),
            subcategoriaId: parseInt(subcategoriaId),
            imagen,
            activo: true
        });

        //recargar con relaciones 
        await nuevoProducto.reload({
            include: [
                {
                    model: categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                },
                {
                    model: subcategoria,
                    as: 'subcategoria',
                    attributes: ['id', 'nombre']
                }
            ]
        });

        //respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'producto creado exitosamente',
            data: {
                producto: nuevoProducto        
            }
        });

    } catch (error) {
        console.error('error en crearProducto:', error);

        //si hubo un error eliminar la imagen subida
        if (req.file) {
            const rutaImagen = path.join(__dirname, '../uploads', req.file.filename);
            try {
                await fs.unlink(rutaImagen);
            } catch (err) {
                console.error('error al eliminar imagen', err)
            }
        }

        if (error.name === 'sequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'error de validacion',
                errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al crear producto',
            error: error.message
        });
    }
};

/**
 * actualizar producto
 * PUT /api/admin/productos/:id
 * body: {nombre, decripcion, precio, sock, categoria Id}
 * @param {Object} req request express
 * @param {Object} res response express
 */

const actualizarProducto = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre, descripcion, precio, stock, categoriaId, subcategoriaId, activo} = req.body;

        //buscar producto
        const producto = await producto.findByPk(id);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        //verificar si se cambia categoria y subcategoria
        if (categoriaId && categoriaId !== producto.categoriaId) {
            const categoria = await categoria.findByPk(categoriaId);

            if (!categoria || !categoria.activo) {
                return res.status(404).json({
                    success: false,
                    message: 'categoria invalida o inactiva'
                });
            }
        }

        if (subcategoriaId && subcategoriaId !== producto.subcategoriaId) {
            const subcategoria = await subcategoria.findByPk(subcategoriaId);

            if (!subcategoria || !subcategoria.activo) {
                return res.status(404).json({
                    success: false,
                    message: 'subcategoria invalida o inactiva'
                });
            }
        }

            const catId = categoriaId || producto.categoriaId;
            if (!subcategoria.categoriaId !== parseInt(catId)) {
                return res.status(404).json({
                    success: false,
                    message: 'la subcategoria no pertenece a la categoria seleccionada'
                });
            }

            //validar precio y stock
            if (precio !== undefined && parseFloat(precio) < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'el precio debe ser mayor a 0'
                });
            }

            if (stock !== undefined && parseInt(stock) < 0) {
                return res.status(400).json({
                    success: false,
                    message:  'el stock no puede ser negativo'
                });
            }

            //manejar imagen
            if (req.file) {
                //eliminar imgen anterior si existe
                if (producto.imagen) {
                    const rutaImagenAnterior = path.jion (__dirname, '../uploads', producto.imagen);
                    try {
                        await fs.unlink(rutaImagenAnterior);
                    } catch (err) {
                        console.error('error al eliminar imagen anterior: ', err);
                    }
                }
                producto.imagen = req.file.filename;
            }

        if (!nuevaCategoria.activo) {
            return res.status(400).json({
                success: false,
                message: `la categoria "${nuevaCategoria.nombre}" esta inactiva`
            });
        }

        //actualizar campos
        if (nombre !== undefined) producto.nombre = nombre;
        if (descripcion !== undefined) producto.descripcion = descripcion;
        if (precio !== undefined) producto.precio = parseFloat(precio);
        if (stock !== undefined) producto.stock = parseInt(stock);
        if (categoriaId !== undefined) producto.categoriaId = parseInt(categoriaId);
        if (subcategoriaId !== undefined) producto.subcategoriaId = parseInt(subcategoriaId);
        if (activo !== undefined) producto.activo = activo;

        //guardar cambios
        await producto.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'producto actualizado exitosamente',
            data: {
                producto
            }
        });

    } catch (error) {
        console.error('error en actualizar producto: ', error);
        if (req.file) {
            const rutaImagen = path.join(__dirname, '../uploads', req.file.filename);
            try {
                await fs.unlink(rutaImagen);
            } catch (err) {
                console.error('error al eliminar imagen: ', err);
            }
        }

        if (error.name === 'sequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'error de validacion',
                errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al actualizar producto',
            error: error.message
        });
    }
};

/**
 * activar/desactivar producto
 * PATCH /api/admin/productos/:id/estado
 * 
 * @param {Object} req request express
 * @param {Object} res response express
 */

const toggleProducto = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar producto
        const producto = await producto.findByPk(id);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        producto.activo = !producto.activo;
        await producto.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: `producto ${producto.activo ? 'activado' : 'desactivado'} exitosamente`,
            data: {
                producto,
                }
            });

    } catch (error) {
        console.error('error en toggleProducto:', error);
        res.status(500).json({
            success: false,
            message: 'error al cambiar estado del producto',
            error: error.message
        });
    }
};

/**
 * eliminar producto 
 * DELETE /api/admin/productos/:id
 * solo permite eliminar si no tiene productos relacionados
 * @param {Object} req request express
 * @param {Object} res request express
 */

const eliminarProducto = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar producto
        const producto = await producto.findByPk(id);
            if (!producto) {
                return res.status(404).json({
                    success: false,
                    message: 'producto no encontrado'
                });
            }

            //eliminar producto
            await producto.destroy();

            //respuesta exitosa 
            res.json({
                success: true,
                message: 'producto eliminado exitosamente'
            });

    } catch (error) {
        console.error('error al eilminar producto', error);
        res.status(500).json({
            success: false,
            message: 'error al eliminar producto',
            error: error.message
        });
    }
};

/**
 * obtener estadisticas de un producto 
 * GET /api/admin/productos/:id/estadisticas
 * retorna
 * total de subcategorias activos / inactivos
 * total de productos activos / inactivos
 * valor total del inventario
 * stock total
 * @param {Object} req request express
 * @param {Object} res request express
 */

const getEstadisticasProducto = async (req, res) => {
    try {
        const {id} = req.params;

        //verificar que la subcategoria exista
        const subcategoria = await subcategoria.findByPk(id [{
            include: [{
                model: categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }]
        }]);

        if (!subcategoria) {
            return res.status(404).json({
                success: false,
                message: 'subcategoria no encontrada'
            });
        }

        //contar productos
        const totalProductos = await producto.count({
            where: {subcategoriaId: id}
        });
        const productosActivos = await producto.count({
            where: {subcategoriaId:  id, activo: true}
        });

        //obtener productos para calcular estadisticas
        const productos = await producto.findAll({
            where: {subcategoria: id},
            attributes: ['precio', 'stock']
        });

        //calcular estadisticas de inventario
        let valorTotalInventario = 0;
        let stockTotal = 0;

        productos.forEach(producto => {
            valorTotalInventario += parseFloat(producto.precio) * producto.stock;
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                subcategoria: {
                id: subcategoria.id,
                nombre: subcategoria.nombre,
                activo: subcategoria.activo,
                categoria: subcategoria.categoria
                },
                estadisticas: {
                    productos: {
                        total: totalProductos,
                        activas: productosActivos,
                        inactivas: totalProductos - productosActivos
                    },
                    inventario: {
                        stockTotal,
                        valorTotal: valorTotalInventario.toFixed(2) //quitar decimales
                    }
                }
            },
        });

    } catch (error) {
        console.error('error en getEstadisticasSubcategoria', error);
        res.status(500).json({
            success: false,
            message: 'error al obtener estadisticas',
            error: error.message
        });
    }
};

//exportar todos los controladores
module.exports = {
    getProductos,
    getProductosById,
    crearProducto,
    actualizarProducto,
    toggleProducto,
    eliminarProducto,
    getEstadisticasProducto
};
