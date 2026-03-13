/**
 * controlador de autenticacion
 * maneja el registro .login y obtencion de perfil de usuario
 */

/**
 * importar modelos 
 */

const Usuario = require('../models/usuario');
const { generateToken } = require('../config/jwt');


/**
 * obtener todos los usuarios
 * GET /api/usuarios
 * query params:
 * activo true/false (filtrar por estado)
 * 
 * @param {Object} req request express
 * @param {Object} res response express 
 */

const registrar = async (req, res) => {
    try {
        const {nombre, apellido, email, password, telefono, direccion} = req.query;

        //validacion 1 verificar q todos los campos requeridos estan presentes
        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'faltan campos requeridos: nombre, apellido, email, password'
            });
        }

        //validacion 2 verificar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'formato de email invalido'
            });
        }

        //validacion 3 verificar la lingitud de la contraseña
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'la contraseña debe tener al menos 6 caracteres'
            });
        }

        //validacion 4 verificar que el email no este registrado
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                message: 'el email ya esta registrado'
            });
        }

/**
 * crear usuario 
 * el hook beforeCreate en el modelo se encarga de hasheear la contraseña antes de guardarla
 * en el rol por defecto es cliente
 * @param {Object} req request express
 * @param {Object} res response express  
 */

        //crear usuario
        const nuevoUsuario = await Usuario.create({
            nombre,
            apellido,
            email,
            password,
            telefono: telefono || null,
            direccion: direccion || null, //si no se proporciona la desccripcion se establece como null
            rol: 'cliente' //rol por defecto
        });

        //generar token JWT con datos del usuario
        const token = generarToken({
            id: nuevoUsuario.id,
            email: nuevoUsuario.email,
            rol: nuevoUsuario.rol
        });

        //respuesta exitosa
        const usuarioRespuesta = nuevoUsuario.toJSON();
        delete usuarioRespuesta.password; //elimina el campo de contraseña
        res.status(201).json({
            success: true, 
            message: 'usuario registrado exitosamente',
            data: {
                usuario: usuarioRespuesta,
                token
            }
        });

    } catch (error) {
        console.error('error en registrar', error);
        return res.status(400).json({
            success: false,
            message: 'error al registrar usuario', 
            errors: error.message
        });
    }
};

/**
 * iniciar sesion login
 * autentica un usuario con email y contraseña
 * retorna el usuario y un token JWT si las credenciales son correctas
 * POST /api/auth/login
 * body: { email, password }
*/

const login = async (req, res) => {
    try {
        //extraer credencialees del body
        const  { email, password } = req.body;

        //validaccion 1: verificar que se proporcionaron email y password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'email y contraseña son requeridos'
            });
        }

        //validacion 2: buscar usuario por email
        //necesitamos incluir el password aqui normalmente se excluye por seguridad
        const usuario = await Usuario.scope('withPassword').findOne({
            where: { email }
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'credenciales invalidas'
            });
        }

        //validacion 3 verificar que el usuario esta activo
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                message: 'usuario inactivo, contacta al administrador'
            });
        }

        //validacion 4: verificar la contraseña 
        //usamos el metodo comparaPassword del modelo usuario
        const passwordValida = await Usuario.compararPassword(password);

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: 'credenciales invalidas'
            });
        }
        //generar token JWT con datos basicos del usuario
        const token = generateToken({
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol
        });

        //preparar respuesta si password 
        const usuarioSinPassword = Usuario.toJSON();
        delete usuarioSinPassword.password;

        //respuesta exitosa
        res.json({
            success: true,
            message: 'inicio de sesion exitoso',
            data: {
                usuario: usuarioSinPassword,
                token
            }
        });

    } catch (error) {
        console.error('error en login', error);
        return res.status(400).json({
            success: false,
            message: 'error al iniciar sesion', 
            errors: error.message
        });
    }
}

/**
 * obtener perfil del usuario autenticado
 * require middleware verificarAuth
 * GET /api/auth/me
 * headers: { authorization: 'bearer TOKEN' }
 */

const getMe = async (req, res) => {
    try {
        //el usuario ya esta en req.usuario
        const usuario = await Usuario.findByPk(req.usuario.id, {
            attributes: { exclude: ['password']}
        }); 

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
        console.error('error en getMe', error);
        res.status(400).json({
            success: false,
            message: 'error al obtener perfil', 
            errors: error.message
        });
    }
};

/**
 * actualizar perfil de usuario autenticado
 * permite al usuario actualizar su informacion personal
 * PUT /api/auth/me
 * @param {Object} req request express
 * @param {Object} res response express
 */

const updateMe = async (req, res) => {
    try {
        const { nombre, apellido, telefono, direccion } = req.body;

        //buscar usuario
        const usuario = await Usuario.findByPk(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }

        //actualizar campos
        if (nombre !== undefined) usuario.nombre = nombre;
        if (apellido !== undefined) usuario.apellido = apellido;
        if (telefono !== undefined) usuario.telefono = telefono;
        if (direccion !== undefined) usuario.direccion = direccion;

        //guardar cambios
        await usuario.save();

        //respuesta exitosa
        res.json({
            success: true,
            message: 'perfil actualizado exitosamente',
            data: {
                usuario: usuario.toJson()
            }
        });

    } catch (error) {
        console.error('error en updateMe: ', error);
        return res.status(500).json({
            success: false,
            message: 'error al actualizar perfil',
            errors: error.message
        });
    }
};

/**
 * cambiar la contraseña del usuario autenticado
 * permite al usuario cambiar su contraseña
 * reqire su contraseña actual por seguridad
 * PUT /api/auth/change-password
 */

const changePassword = async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;

        //validacion 1 verificar que se proporcionaron ambas contraseñas
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({
                success: false,
                message: 'se requiere contraseña actual y nueva contraseña'
            });
        }

        //validacion 2 verificar que se proporcionaron ambas contraseñas
        if (!passwordActual.length < 6 ) {
            return res.status(400).json({
                success: false,
                message: 'la contraseña actual debe tener al menos 6 caracteres'
            });
        }

        //validacion 3 buscar usuario con password incluido
        const usuario = await Usuario.scope('withPassword').findByPk(req.usuario.id);
        if (!usuario) {
            return res.status(400).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }

        //validacion 4 verificar que la contraseña actual sea correcta
        const passwordValida = await Usuario.compararPassword(passwordActual);
        if (!passwordValida) {
            return res.status(400).json({
                success: false,
                message: 'contraseña actual incorrecta'
            });
        }

        //actualizar contraseña
        usuario.password = passwordNueva;
        await usuario.save();

        //respuesta exitosa
        res.status(400).json({
            success: true,
            message: 'contraseña actualizada exitosamente'
        })

    } catch (error) {
        console.error('error en changePassword: ', error);
        return res.status(500).json({
            success: false,
            message: 'error al cambiar contraseña',
            errors: error.message
        });
    }
}

//exportar todos los controladores
module.exports = {
    registrar,
    login,
    getMe,
    updateMe,
    changePassword,
};
