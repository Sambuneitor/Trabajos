/**
 * controlador de usuarios admin
 * maneja las operaciones crud y activar y desactivar categorias
 * solo accesible por admins
 */

/**
 * importar modelos 
 */

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
 * activar/desactivar usuario
 * PATCH /api/admin/usuarios/:id/estado
 * 
 * al desactivar un usuario
 * @param {Object} req request express
 * @param {Object} res response express
 */
const toggleUsuario = async (req, res) => {
    try {
        const {id} = req.params;

        //buscar usuairo
        const usuario = await usuario.findByPk (id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }
        //no permitir desactivar el propio admin
        if (usuario.id === req.usuario.id) {
            return res.status(400).json({
                success: false,
                message: 'no puedes desactivar tu propia cuenta'
            });
        }

        usuario.activo = !usuario.activo;
        await usuario.save();

        res.json({
            success: true,
            message: `usuario ${usuario.activo ? 'activado' : 'desactivado'} exitosamente`,
            data: {
                usuario: usuario.toJSON()
            }
        });

    } catch (error) {
        console.error('error en toggleUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'error al cambiar estado del usuario',
            error: error.message
        });
    }
};

/**
 * eliminar usuario 
 * DELETE /api/admin/usuarios/:id
 * @param {Object} req request express
 * @param {Object} res request express
 */
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        //buscar usuario
        const usuario = await usuario.findByPk(id);
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'usuario no encontrado'
                });
            }
            //no permitir eliminar al propio admin
            if (usuario.id === req.usuario.id) {
                return res.status(400).json({
                    success: false,
                    message: 'no puedes eliminar tu propia cuenta'
                });
            }
            await usuario.destroy();

            //respuesta exitosa 
            res.json({
                success: true,
                message: 'usuario eliminado exitosamente'
            });

    } catch (error) {
        console.error('error en eliminarUsuario', error);
        res.status(500).json({
            success: false,
            message: 'error al eliminar usuario',
            error: error.message
        });
    }
};

/**
 * obtener estadisticas de usuarios 
 * GET /api/admin/usuario/:id/estadisticas
 * 
 * @param {Object} req request express
 * @param {Object} res request express
 */
const getEstadisticasUsuarios = async (req, res) => {
    try {
        //datos de usuarios
        const totalUsuarios = await usuario.count();
        const totalClientes = await usuario.count({
            where: { rol: 'cliente'}
        });
        const totalAdmins = await usuario.count({
            where: { rol: 'administrador'}
        });
        const usuariosActivos = await usuario.count({
            where: { activo: true}
        });
        const usuariosInactivos = await usuario.count({
            where: { activo: false}
        });

        //respuesta exitosa
        res.json({
            success: true,
            data: {
                total: totalUsuarios,
                porRol: {
                    clientes: totalClientes,
                    administradores: totalAdmins,
                },
                porEstado: {
                    activos: usuariosActivos,
                    inactivos: usuariosInactivos,
                },
            },
        });

    } catch (error) {
        console.error('error en getEstadisticasUsuarios', error);
        res.status(500).json({
            success: false,
            message: 'error al obtener estadisticas',
            error: error.message
        });
    }
};

//exportar todos los controladores
module.exports = {
    getUsuarios,
    getUsuarioById,
    crearUsuario,
    actualizarUsuario,
    toggleUsuario,
    eliminarUsuario,
    getEstadisticasUsuarios
};
