/**
 * controlador de usuarios admin
 * maneja las operaciones crud y activar y desactivar categorias
 * solo accesible por admins
 */

/**
 * importar modelos 
 */

const usuario = require('../models/usuario');
const usuario = require('../models/usuario');
const usuario = require('../models/usuario');


/**
 * obtener todos los usuarios
 * GET /api/usuarios
 * query params:
 * activo true/false (filtrar por estado)
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getUsuarios = async (req, res) => {
    try {
        const {rol, activo, buscar, pagina = 1, limite = 10} = req.query;

        //construir los filtros
        const where = {};
        if (rol) where.rol = rol;
        if (activo !== undefined) where.activo = activo === 'true';

        //busqueda pr texto
        if (buscar) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { nombre: { [Op.like]: `%${buscar}%` } },
                { apellido: { [Op.like]: `%${buscar}%` } },
                { email: { [Op.like]: `%${buscar}%` } },
            ];
        }

        //paginacion
        const offset = (parseInt(pagina) -1) * parseInt(limite);

        //obtener usuarios sin password
        const {count, rows: usuarios} = await usuario.findAndCountAll({
            where,
            attributes: { exclude: ['password'] },
            limit: parseInt(limite),
            offset,
            order: [['createdAt', 'DESC']]
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                usuarios,
                paginacion: {
                    total: count,
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    totalPaginas: Math.ceil(count / parseInt(limite))
                }
            }
        });

    } catch (error) {
        console.error('error en getUsuarios:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener usuarios', 
            error: error.message
        });
    }
};

/**
 * obtener un usuario por id
 * GET /api/admin/usuarios/:id
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const getUsuarioById = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar usuarios
        const usuario = await usuario.findByPk(id, {
            attributes: { exclude: ['password'] },
        });

        //filtrar por estado activo si es especifico
        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                usuario
            }
        });

    } catch (error) {
        console.error('error en getUsuarioById:', error);
        res.status (500).json({
            success: false,
            message: 'error al obtener usuario', 
            error: error.message
        })
    }
};

/**
 * crear nuevo usuario 
 * POST /api/admin/usuarios
 * body: {nombre, apellido, email, password, rol, telefono, direccion}
 * @param {Object} req request express
 * @param {Object} res response express  
 */

const crearUsuario =async (req, res) => {
    try {
        const {nombre, apellido, email, password, rol, telefono, direccion} = req.body;

        //validciones
        if (!nombre || !apellido || !email || !password || !rol) {
            return res.status(400).json({
                success: false,
                message: 'faltan campos requeridos: nombre, apellido, email, password, rol'
            });
        }

        //validar rol
        if (!['cliente', 'auxiliar', 'administrador'].includes(rol)) {
            return res.status(400).json({
                success: false,
                messages: 'rol invalido. debe ser: cliente, auxiliar o administrador'
            });
        }

        //validar email unico 
        const usuarioExistente = await usuario.findOne({
            where: {email}
        });

        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                message: 'el email ya esta registrado'
            });
        }

        //crear usuario
        const nuevoUsuario = await usuario.create({
            nombre,
            apellido,
            email,
            password,
            rol,
            telefono: telefono || null,
            direccion: direccion || null, //si no se proporciona la desccripcion se establece como null
            activo: true
        });

        //respuesta exitosa
        res.status(201).json({
            success: true, 
            message: 'usuario creado exitosamente',
            data: {
                usuario: nuevoUsuario.toJson() //convertir a json para excluir campos sensibles
            }
        });

        } catch (error) {
            console.error('error en crearUsuario', error);
            if (error.name === 'swquelizeValidationError'){
            return res.status(400).json({
                success: false,
                message: 'error de validacion', 
                errors: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'error al crear usuario',
            error: error.message
        })
    }
};

/**
 * actualizar usuario
 * PUT /api/usuarios/:id
 * body: {nombre, apellido, email, password, rol, telefono, direccion}
 * @param {Object} req request express
 * @param {Object} res response express
 */

const actualizarUsuario = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre, apellido, telefono, direccion, rol} = req.body;

        //buscar usuario
        const usuario = await usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }

        //validar rol si se proporciona
        if (rol && ['cliente', 'administrador'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'rol invalido'
            });
        }

        //actualizar campos
        if (nombre !== undefined) usuario.nombre = nombre;
        if (apellido !== undefined) usuario.apellido = apellido;
        if (telefono !== undefined) usuario.telefono = telefono;
        if (direccion !== undefined) usuario.direccion = direccion;
        if (rol !== undefined) usuario.rol = rol;

        //guardar cambios
        await usuario.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'usuario actualizado exitosamente',
            data: {
                usuario: usuario.toJson()
            }
        });

    } catch (error) {
        console.error('error en actualizarUsuario: ', error);
        return res.status(500).json({
            success: false,
            message: 'error al actualizar',
            errors: error.message
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
                        activas: subcategoriasActivas,
                        inactivas: totalSubcategorias - subcategoriasActivas
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
