/**
 * controlador de categorias
 * maneja las operaciones crud y activar y desactivar categorias
 * solo accesible por admins
 */

/**
 * importar modelos 
 */

const categoria = require('../models/categoria');
const subcategoria = require('../models/subcategoria');
const producto = require('../models/producto');


/**
 * obtener todas las categorias 
 * query params:
 * activo true/false (filtrar por estado)
 * incluirsubcatrgoria true/false (incluir subcategorias relacionadas)
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getCategorias = async (req, res) => {
    try {
        const {activo, incluirSubcategorias} = req.query;

        //opciones de consulta
        const opciones = {
            order: [['nombre', 'ASC']] // ordenar de manera alfabetica
        };

        //filtrar por estado activo si es especifico
        if (activo !== undefined) {
            opciones.where = {activo: activo === 'true'};
        }

        //incluir subcategorias si se solicita 
        if (incluirSubcategorias === 'true') {
            opciones.include == [{
                model: subcategoria,
                as: 'subcategorias', // campo del alias para la relacion
                attributes: ['id', 'nombre', 'descipcion', 'activo'] //campos a incluir de la subcategoria
            }]
        }

        //obtener categorias
        const categorias = await categoria.findAll (opciones);

        //respuesta exitosa
        res.json({
            success: true,
            count: categorias.length,
            data: {
                categorias
            }
        });

    } catch (error) {
        console.error('error en getCategorias:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener categorias', error: error.message
        })
    }
};

/**
 * obtener las categorias por id
 * GET /api/categorias/:id
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getCategoriasById = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar categorias con subcategorias y contar productos
        const categoria = await categoria.findByPk(id, {
            include: [{
                model: subcategoria,
                as: 'subcategorias',
                attributes: ['id', 'nombre', 'descripcion', 'activoo']
            },
            {
                model: producto,
                as: 'productos',
                attributes: ['id']
            }]
        });

        //filtrar por estado activo si es especifico
        if (!categoria) {
            return res.status(404).json({
                success: false,
                message: 'categoria no encontrada'
            });
        }

        //agregar contador de productos
        const categoriaJSON = categoria.toJSON();
        categoriaJSON.totalProductos = categoriaJSON.productos.length;
        delete categoriaJSON.productos; //no enviar lista completa solo el contador

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                categoria: categoriaJSON
            }
        });

    } catch (error) {
        console.error('error en getCategoriasById:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener categoria', error: error.message
        })
    }
};

/**
 * crear una categoria 
 * POST /api/admin/categorias
 * body: {nombre, descripcion}
 * @param {Object} req request express
 * @param {Object} res response express  
 */

const crearCategoria =async (req, res) => {
    try {
        const {nombre, descripcion} = req.body;

        //validcion 1 verificar campos requeridos 
        if (!nombre){
            return res.status(400).json({
                success: false,
                message: 'el nombre de la categoria es requerido'
            });
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

const actualizarCatagoria = async (req, res) => {
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

    }
};