/**
 * controlador de producto
 * maneja las operaciones crud y activar y desactivar productos
 * solo accesible por admins
 */

/**
 * importar modelos 
 */
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');
const Subcategoria = require('../models/subcategoria');

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

        if (buscar) {
            const { Op } = require('sequelize');
            //op.or busca por nombre o descipcion
            //Op.like aquivale a un like en sql con comodines para buscar en considencias parciales
            where[Op.or] = [
                { nombre: { [Op.like]: `%${buscar}%` }},
                { descripcion: { [Op.like]: `%${buscar}%` }}
            ];
        }

        //paginacion
        const offset = (parseInt(pagina) -1) * parseInt(limite);

        //opciones de consulta
        const opciones = {
            where,
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
            ],
            limit: parseInt(limite),
            offset,
            order: [['nombre', 'ASC']]
        };

        //obtener productos y total 
        const { count, rows: productos } = await Producto.findAndCountAll(opciones);

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

const getProductoById = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar productos con relacion
        const producto = await Producto.findByPk(id, {
            include: [
                {
                    model: Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre', 'activo']
                },
                {
                    model: Subcategoria,
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

const crearProducto = async (req, res) => {
    try {
        const {nombre, descripcion, precio, stock, categoriaId, subcategoriaId} = req.body;

        //validcion 1 verificar campos requeridos 
        if (!nombre || !precio || !categoriaId || !subcategoriaId) {
            return res.status(400).json({
                success: false,
                message: 'faltan campos requerios nombre, precio, categoriaId y subcategoriaId'
            });
        }

        //validacion 2 verifica si la categoria existe y esta activa
        const categoria = await Categoria.findByPk(categoriaId);
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
        const subcategoria = await Subcategoria.findByPk(subcategoriaId);

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
        const nuevoProducto = await Producto.create({
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
        const producto = await Producto.findByPk(id);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        //verificar si se cambia categoria y subcategoria
        if (categoriaId && categoriaId !== Producto.categoriaId) {
            const categoria = await Categoria.findByPk(categoriaId);

            if (!categoria || !categoria.activo) {
                return res.status(404).json({
                    success: false,
                    message: 'categoria invalida o inactiva'
                });
            }
        }

        if (subcategoriaId && subcategoriaId !== Producto.subcategoriaId) {
            const subcategoria = await Subcategoria.findByPk(subcategoriaId);

            if (!subcategoria || !subcategoria.activo) {
                return res.status(404).json({
                    success: false,
                    message: 'subcategoria invalida o inactiva'
                });
            }
        }

            const catId = categoriaId || Producto.categoriaId;
            if (!Subcategoria.categoriaId !== parseInt(catId)) {
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
        if (nombre !== undefined) Producto.nombre = nombre;
        if (descripcion !== undefined) Producto.descripcion = descripcion;
        if (precio !== undefined) Producto.precio = parseFloat(precio);
        if (stock !== undefined) Producto.stock = parseInt(stock);
        if (categoriaId !== undefined) Producto.categoriaId = parseInt(categoriaId);
        if (subcategoriaId !== undefined) Producto.subcategoriaId = parseInt(subcategoriaId);
        if (activo !== undefined) Producto.activo = activo;

        //guardar cambios
        await Producto.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'producto actualizado exitosamente',
            data: {
                producto
            }
        });

    } catch (error) {
        console.error('error en actualizarProducto: ', error);
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
        const producto = await Producto.findByPk(id);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        producto.activo = !producto.activo;
        await Producto.save();

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
 * elimina el producto y su imagen 
 * @param {Object} req request express
 * @param {Object} res request express
 */

const eliminarProducto = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar producto
        const producto = await Producto.findByPk(id);
            if (!producto) {
                return res.status(404).json({
                    success: false,
                    message: 'producto no encontrado'
                });
            }

            //el hook beforDestroy se encarga de eliminar la imagen
            await Producto.destroy();

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
 * actualizar stok de un producto
 * 
 * PATCH /api/admin/productos/:id/stock
 * body: {cantidad, operacion: 'aumentar' | 'reducir' | 'establecer'}
 * @param {Object} req request express
 * @param {Object} res response express 
 */
const actualizarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, operacion } = req.body;

        if (!cantidad || !operacion) {
            return res.status(400).json({
                success: false,
                message: 'se requiere cantidad y operacion'
            });
        }

        const cantidadNum = parseInt(cantidad);
        if (cantidadNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'la cantidad no puede ser negariva'
            });
        }
        const producto = await Producto.findByPk(id);

        if(!producto) {
            return res.status(404).json({
                success: false,
                message: 'producto no encontrado'
            });
        }

        let nuevoStock;

        switch (operacion) {
            case 'aumentar':
                nuevoStock = producto.aumentarStock(cantidadNum);
                break;
            case 'reducir':
                if (cantidadNum > producto.stock) {
                    return res.status(400).json({
                        success: false,
                        message: `no hay suficiente stock. stock actual: ${producto.stock}`
                    });
                }
                nuevoStock = producto.reducirStock(cantidadNum);
                break;
            case 'establecer':
                nuevoStock = cantidadNum;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'operacion invalida usa aumentar, reducir o establecer'
                });
        }

        producto.stock = nuevoStock;
        await  Producto.save();

        res.json({
            success: true,
            message: `stock ${operacion === 'aumentar' ? 'aumentado' : operacion === 'reducir' ? 'reducido' : 'establecido'} exitosamente`,
            data: {
                productoId: producto.id,
                nombre: producto.nombre,
                stockAnterior: operacion === 'establecer' ? null : (operacion === 'aumentar' ? producto.stock - cantidadNum : producto.stock + cantidadNum),
                stockNuevo: producto.stock
            }
        });

    } catch (error) {
        console.error('error en actualizarStock: ', error);
        res.status(500).json({
            success: false,
            message: 'error al actualizar stock',
            error: error.message
        });
    }
};

//exportar todos los controladores
module.exports = {
    getProductos,
    getProductoById,
    crearProducto,
    actualizarProducto,
    toggleProducto,
    eliminarProducto,
    actualizarStock,
};
