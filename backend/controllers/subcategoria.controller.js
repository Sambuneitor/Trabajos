/**
 * controlador de subcategorias
 * maneja las operaciones crud y activar y desactivar subcategorias
 * solo accesible por admins
 */

/**
 * importar modelos 
 */

const subcategoria = require('../models/subcategoria');
const categoria = require('../models/categoria');
const producto = require('../models/producto');


/**
 * obtener todas las subcategorias 
 * query params:
 * categoriaId: Id de la categoria para filtrar por categoria
 * activo true/false (filtrar por estado)
 * incluir catrgoria true/false (incluir categoria relacionada)
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getSubcategorias = async (req, res) => {
    try {
        const {categoriaId, activo, incluirCategoria} = req.query;

        //opciones de consulta
        const opciones = {
            order: [['nombre', 'ASC']] // ordenar de manera alfabetica
        };

        //filtros 
        const where = {};
        if (categoriaId) where.categoriaId = categoriaId;
        if (activo !== undefined) where.activo = activo === 'true';

        if (Object.keys(where).length > 0) {
            opciones.where = where;
        }

        //incluir categoria si se solicita 
        if (incluirCategoria === 'true') {
            opciones.include == [{
                model: categoria,
                as: 'categoria', // campo del alias para la relacion
                attributes: ['id', 'nombre', 'activo'] //campos a incluir de la categoria
            }]
        }

        //obtener subcategoria
        const subcategorias = await subcategoria.findAll (opciones);

        //respuesta exitosa
        res.json({
            success: true,
            count: subcategorias.length,
            data: {
                subcategorias
            }
        });

    } catch (error) {
        console.error('error en getSubcategorias:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener subcategorias', error: error.message
        })
    }
};

/**
 * obtener las subcategorias por id
 * GET /api/subcategorias/:id
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getSubcategoriasById = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar subcategorias con categoria y contar productos
        const subcategoria = await subcategoria.findByPk(id, {
            include: [{
                model: categoria,
                as: 'categorias',
                attributes: ['id', 'nombre', 'activo']
            },
            {
                model: producto,
                as: 'productos',
                attributes: ['id']
            }]
        });

        //filtrar por estado activo si es especifico
        if (!subcategoria) {
            return res.status(404).json({
                success: false,
                message: 'subcategoria no encontrada'
            });
        }

        //agregar contador de productos
        const subcategoriaJSON = subcategoria.toJSON();
        subcategoriaJSON.totalProductos = subcategoriaJSON.productos.length;
        delete subcategoriaJSON.productos; //no enviar lista completa solo el contador

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                subcategoria: subcategoriaJSON
            }
        });

    } catch (error) {
        console.error('error en getSubcategoriasById:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener subcategoria', error: error.message
        })
    }
};

/**
 * crear una subcategoria 
 * POST /api/admin/subcategorias
 * body: {nombre, descripcion}
 * @param {Object} req request express
 * @param {Object} res response express  
 */

const crearSubcategoria =async (req, res) => {
    try {
        const {nombre, descripcion, categoriaId} = req.body;

        //validcion 1 verificar campos requeridos 
        if (!nombre || !categoriaId){
            return res.status(400).json({
                success: false,
                message: 'el nombre y categoriaId es requerido'
            });
        }

        //verificar si la categoria exista
        const categoria = await categoria.findByPk(categoriaId);
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: `no existe la categoria con id ${categoriaId}`
            })
        }

        //validacion 2 verificar que el nombre no exista 
        const categoriaExistente = await categoria.findOne({where: {nombre}
        });

        if (categoriaExistente) {
            return res.status(400).json({
                success: false,
                message: `ya existe una categoria con el nombre "${nombre}"`
            });
        }

        //crear categoria
        const nuevaCategoria = await categoria.create({
            nombre,
            descripcion: descripcion || null, //si no se proporciona la desccripcion se establece como null
            activo: true
        });

        //respuesta exitosa
        res.status(201).json({
            success: true, 
            message: 'categoria creada exitosamente',
            data: {
                categoria: nuevaCategoria
            }
        });

        } catch (error) {
            if (error.name === 'swquelizeValidationError'){
            return res.status (400).json({
                success: false,
                message: 'error de validacion', errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al crear categoria',
            error: error.message
        })
    }
};

/**
 * actualizar categoria
 * PUT /api/categorias/:id
 * body: {nombre, decripcion}
 * @param {Object} req request express
 * @param {Object} res response express
 */

const actualizarCategoria = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre, descripcion} = req.body;

        //buscar categoria
        const categoria = await categoria.findByPk(id);

        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'categoria no encontrada'
            });
        }

        //validacion 1 si se cambia el nombre verificar que no exista
        if (nombre && nombre !== categoria.nombre) {
            const categoriaConMismoNombre = await categoria.findOne({where: {nombre}
            });

            if (categoriaConMismoNombre) {
                return res.status(400).json({
                    success: false,
                    message: `ya existe una categoria con el nombre "${nombre}"`
                });
            }
        }

        //actualizar campos
        if (nombre !== undefined) categoria.nombre = nombre;
        if (descripcion !== undefined) categoria.descripcion = descripcion;
        if (activo !== undefined) categoria.activo = activo;

        //guardar cambios
        await categoria.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'categoria actualizada exitosamente',
            data: {
                categoria
            }
        });

    } catch (error) {
        console.error('error en actualizar categoria: ', error);

        if (error.name === 'sequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'error de validacion',
                errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al actualizar categoria',
            error: error.message
        });
    }
};

/**
 * activar/desactivar categoria
 * PATCH /api/admin/categorias/:id/estado
 * 
 * al desactivar una categoria se desactivan todas las subcategorias relacionadas
 * al desactivar una subcategoria se desactivan todos los productos relacionados
 * @param {Object} req request express
 * @param {Object} res response express
 */
const toggleCategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar categoria
        const categoria = await categoria.findByPk (id);

        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'categoria no encontrada'
            });
        }

        //alternar estado activo
        const nuevoEstado = !categoria.activo;
        categoria.activo = nuevoEstado;
        
        //guardar cambios
        await categoria.save();

        //contar cuantos registros se afectaron
        const subcategoriasAfectadas = await subcategoria.count({where: {categoriaId: id}
        });

        const productosAfectados = await producto.count({where: {categoriaId: id}
        });

        //respuesta exitosa
        res.json({
            success: true,
            message: `categoria ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
            data: {
                categoria,
                afectados: {
                    subcategorias: subcategoriasAfectadas,
                    productos: productosAfectados
                }
            }
        });

    } catch (error) {
        console.error('error en toggleCategoria:', error);
        res.status(500).json({
            success: false,
            message: 'error al cambiar estado de la categoria',
            error: error.message
        });
    }
};

/**
 * eliminar categoria 
 * DELETE /api/admin/categorias/:id
 * dolo permite eliminar si no tiene subcategorias ni productos relacionados
 * @param {Object} req request express
 * @param {Object} res request express
 */
const eliminarCategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar categoria
        const categoria = await categoria.findByPk(id);
            if (!categoria) {
                return res.status(404).json({
                    success: false,
                    message: 'categoria no encontrada'
                });
            }

            //validacion verificar que no tenga subcategorias
            const subcategorias = await subcategoria.count({
                where: {categoriaId: id}
            });

            if (subcategorias > 0) {
                return res.status(400).json({
                    success: false,
                    message: `no se puede eliminar la categoria porque tiene ${subcategorias} subcategorias asociadas usa PATCH /api/admin/categorias/:id togle para desactivarla en lugar de eliminar `
                });
            }

            //validacion verificar que no tenga productos
            const productos = await producto.count({
                where: {categoriaId: id}
            });

            if (productos > 0) {
                return res.status(400).json({
                    success: false,
                    message: `no se puede eliminar la categoria porque tiene ${productos} productos asociados usa PATCH /api/admin/categorias/:id togle para desactivarla en lugar de eliminar `
                });
            }

            //eliminar categoria
            await categoria.destroy();

            //respuesta exitosa 
            res.json({
                success: true,
                message: 'categoria eliminada exitosamente'
            });

    } catch (error) {
        console.error('error al eilminar categoria', error);
        res.status(500).json({
            success: false,
            message: 'error al eliminar categoria',
            error: error.message
        });
    }
};

/**
 * obtener estadisticas de una categoria 
 * GET /api/admin/categorias/:id/estadisticas
 * retorna
 * total de suubcategorias activas / inactivas
 * total de productos activos / inactivos
 * valor total del inventario
 * stock total
 * @param {Object} req request express
 * @param {Object} res request express
 */
const getEstadisticasCategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //verificar que la categoria exista
        const categoria = await categoria.findByPk(id);

        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'categoria no encontrada'
            });
        }

        //contar subcategorias 
        const totalSubcategorias = await subcategoria.count({
            where: {categoriaId: id}
        });
        const subcategoriasActivas = await subcategoria.count({
            where: {categoriaId:  id, activo: true}
        });

        //contar productos
        const totalProductos = await producto.count({
            where: {categoriaId: id}
        });
        const productosActivos = await producto.count({
            where: {categoriaId:  id, activo: true}
        });

        //obtener productos para calcular estadisticas
        const productos = await producto.findAll({
            where: {categoria: id},
            attributes: ['precio', 'stock']
        });

        //calcular estadisticas de inventario
        let valorTotalInventario = 0;
        let stockTotal = 0;

        productos.forEach(producto => {
            valorTotalInventario += parseFloat(producto.precio) * producto.stock;
            stockTotal += producto.stock;
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                categoria: {
                id: categoria.id,
                nombre: categoria.nombre,
                activo: categoria.activo,
                },
                estadisticas: {
                    Subcategorias: {
                        total: totalSubcategorias,
                        activas: subcategoriasActivas
                    },
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
        console.error('error en getEstadisticasCategoria', error);
        res.status(500).json({
            success: false,
            message: 'error al obtener estadisticas',
            error: error.message
        });
    }
};

//exportar todos los controladores
module.exports = {
    getCategorias,
    getCategoriasById,
    crearCategoria,
    actualizarCategoria,
    toggleCategoria,
    eliminarCategoria,
    getEstadisticasCategoria
};
