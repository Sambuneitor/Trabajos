/**
 * controlador de subcategorias
 * maneja las operaciones crud y activar y desactivar subcategorias
 * solo accesible por admins
 */

/**
 * importar modelos 
 */

const Subcategoria = require('../models/subcategoria');
const Categoria = require('../models/categoria');
const Producto = require('../models/producto');


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
                model: Categoria,
                as: 'categoria', // campo del alias para la relacion
                attributes: ['id', 'nombre', 'activo'] //campos a incluir de la categoria
            }]
        }

        //obtener subcategoria
        const subcategorias = await Subcategoria.findAll (opciones);

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
        const subcategoria = await Subcategoria.findByPk(id, {
            include: [{
                model: Categoria,
                as: 'categorias',
                attributes: ['id', 'nombre', 'activo']
            },
            {
                model: Producto,
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
        const subcategoriaJSON = Subcategoria.toJSON();
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

        //validacion 2 verificar si la categoria existe
        const categoria = await Categoria.findByPk(categoriaId);
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: `no existe la categoria con id ${categoriaId}`
            });
        }

        //validacion 3 verifica si la categoria esta activa
        if (!categoria.activo) {
            return res.status(400).json({
                success: false,
                message: `la categoria "${categoria.nombre}" esta inactiva, activela primero`
            });
        }

        //validacion 4 verificar no exista una subcategoria con el mismo nombre
        const subcategoriaExistente = await Subcategoria.findOne({where: {nombre, categoriaId}
        });

        if (subcategoriaExistente) {
            return res.status(400).json({
                success: false,
                message: `ya existe una subcategoria con el nombre "${nombre}"`
            });
        }

        //crear subcategoria
        const nuevaSubcategoria = await Subcategoria.create({
            nombre,
            descripcion: descripcion || null, //si no se proporciona la desccripcion se establece como null
            categoriaId,
            activo: true
        });

        //obtener subcategoria con los datos de la categoria
        const subcategoriaConCategoria = await Subcategoria.findByPk(nuevaSubcategoria.id,{
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }]
        });

        //respuesta exitosa
        res.status(201).json({
            success: true, 
            message: 'subcategoria creada exitosamente',
            data: {
                subcategoria: subcategoriaConCategoria
            }
        });

        } catch (error) {
            console.error('error en crearSubcategoria:', error);
            if (error.name === 'swquelizeValidationError'){
            return res.status (400).json({
                success: false,
                message: 'error de validacion', errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al crear subcategoria',
            error: error.message
        })
    }
};

/**
 * actualizar subcategoria
 * PUT /api/subcategorias/:id
 * body: {nombre, decripcion}
 * @param {Object} req request express
 * @param {Object} res response express
 */

const actualizarSubcategoria = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre, descripcion, categoriaId, activo} = req.body;

        //buscar subcategoria
        const subcategoria = await Subcategoria.findByPk(id);

        if (!subcategoria) {
            return res.status(404).json({
                success: false,
                message: 'subcategoria no encontrada'
            });
        }

        //verificar si la categoria existe y esta activa
        if (categoriaId && categoriaId !== Subcategoria.categoriaId) {
            const nuevaCategoria = await Categoria.findByPk(categoriaId);

            if (!nuevaCategoria) {
                return res.status(404).json({
                    success: false,
                    message: `no existe la categoria con id ${categoriaId}`
                });
            }
        }

        if (!nuevaCategoria.activo) {
            return res.status(400).json({
                success: false,
                message: `la categoria "${nuevaCategoria.nombre}" esta inactiva`
            });
        }

        //validacion 1 si se cambia el nombre verificar que no exista
        if (nombre && nombre !== Subcategoria.nombre) {
            const categoriaFinal = categoriaId || subcategoria.categoriaId; //si no se cambia la categoria usar la categoria actual

            const subcategoriaConMismoNombre = await Subcategoria.findOne({
                where: {
                    nombre,
                    categoriaId: categoriaFinal
                }
            });

            if (subcategoriaConMismoNombre) {
                return res.status(400).json({
                    success: false,
                    message: `ya existe una subcategoria con el nombre "${nombre}" en esta categoria`
                });
            }
        }

        //actualizar campos
        if (nombre !== undefined) Subcategoria.nombre = nombre;
        if (descripcion !== undefined) Subcategoria.descripcion = descripcion;
        if (categoriaId !== undefined) Subcategoria.categoriaId = categoriaId;
        if (activo !== undefined) Subcategoria.activo = activo;

        //guardar cambios
        await Subcategoria.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'subcategoria actualizada exitosamente',
            data: {
                Categoria
            }
        });

    } catch (error) {
        console.error('error en actualizar subcategoria: ', error);

        if (error.name === 'sequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'error de validacion',
                errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al actualizar subcategoria',
            error: error.message
        });
    }
};

/**
 * activar/desactivar subcategoria
 * PATCH /api/admin/subcategorias/:id/estado
 * 
 * al desactivar una subcategoria se desactivan todos los productos relacionados
 * @param {Object} req request express
 * @param {Object} res response express
 */

const toggleSubcategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar subcategoria
        const subcategoria = await Subcategoria.findByPk(id);

        if (!subcategoria) {
            return res.status(404).json({
                success: false,
                message: 'subcategoria no encontrada'
            });
        }

        //alternar estado activo
        const nuevoEstado = !Subcategoria.activo;
        Subcategoria.activo = nuevoEstado;
        
        //guardar cambios
        await Categoria.save();

        //contar cuantos registros se afectaron
        const productosAfectados = await Producto.count({where: {subcategoriaId: id}
        });

        //respuesta exitosa
        res.json({
            success: true,
            message: `subcategoria ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
            data: {
                subcategoria,
                productosAfectados
                }
            });

    } catch (error) {
        console.error('error en toggleSubcategoria:', error);
        res.status(500).json({
            success: false,
            message: 'error al cambiar estado de la subcategoria',
            error: error.message
        });
    }
};

/**
 * eliminar subcategoria 
 * DELETE /api/admin/subcategorias/:id
 * solo permite eliminar si no tiene productos relacionados
 * @param {Object} req request express
 * @param {Object} res request express
 */

const eliminarSubcategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar subcategoria
        const subcategoria = await Subcategoria.findByPk(id);
            if (!subcategoria) {
                return res.status(404).json({
                    success: false,
                    message: 'subcategoria no encontrada'
                });
            }

            //validacion verificar que no tenga productos
            const productos = await Producto.count({
                where: {subcategoriaId: id}
            });

            if (productos > 0) {
                return res.status(400).json({
                    success: false,
                    message: `no se puede eliminar la subcategoria porque tiene ${productos} productos asociados usa PATCH /api/admin/subcategorias/:id togle para desactivarla en lugar de eliminar `
                });
            }

            //eliminar subcategoria
            await Subcategoria.destroy();

            //respuesta exitosa 
            res.json({
                success: true,
                message: 'subcategoria eliminada exitosamente'
            });

    } catch (error) {
        console.error('error al eilminar subcategoria', error);
        res.status(500).json({
            success: false,
            message: 'error al eliminar subcategoria',
            error: error.message
        });
    }
};

/**
 * obtener estadisticas de una subcategoria 
 * GET /api/admin/subcategorias/:id/estadisticas
 * retorna
 * total de subcategorias activos / inactivos
 * total de productos activos / inactivos
 * valor total del inventario
 * stock total
 * @param {Object} req request express
 * @param {Object} res request express
 */

const getEstadisticasSubcategoria = async (req, res) => {
    try {
        const {id} = req.params;

        //verificar que la subcategoria exista
        const subcategoria = await Subcategoria.findByPk(id [{
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
        const totalProductos = await Producto.count({
            where: {subcategoriaId: id}
        });
        const productosActivos = await Producto.count({
            where: {subcategoriaId:  id, activo: true}
        });

        //obtener productos para calcular estadisticas
        const productos = await Producto.findAll({
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
                id: Subcategoria.id,
                nombre: Subcategoria.nombre,
                activo: Subcategoria.activo,
                categoria: Subcategoria.categoria
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
    getSubcategorias,
    getSubcategoriasById,
    crearSubcategoria,
    actualizarSubcategoria,
    toggleSubcategoria,
    eliminarSubcategoria,
    getEstadisticasSubcategoria
};
