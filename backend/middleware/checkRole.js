/**
 * middleware de verificar roles 
 * este middleware verifica que el usuario tenga un rol requerido
 * debe usarse despues de middleware de autenticacion
 */

const esAdministrador = (req, res, next) => {
    try {
        //verificar que existe req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                succes: false,
                message: 'no autorizado debes iniciar sesion primero'
            });
        }

        //verificar que el rol es administrador 
        if (req.usuario.rol !== 'administrador') {
            return res.status(403).json({
                succes: false,
                message: 'acceso denegado se requiere permisos de administrador'
            });
        }

        //el usuario es administrador continuar 
        next();

    } catch (error) {
        console.error('error en middleware esAdministrador', error);
        return res.status(500).json({
            succes: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};

/**
 * middleware para verificar si el usuario es cliente
 */
const esCliente = (req, res, next) => {
    try {
        //verificar que existe req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                succes: false,
                message: 'no autorizado debes iniciar sesion primero'
            });
        }

        //verificar que el rol es cliente 
        if (req.usuario.rol !== 'cliente') {
            return res.status(403).json({
                succes: false,
                message: 'acceso denegado se requiere permisos de cliente'
            });
        }

        //el usuario es cliente continuar 
        next();

    } catch (error) {
        console.error('error en middleware esCliente', error);
        return res.status(500).json({
            succes: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};

/**
 * middleware flexible para verificar multiples roles
 * permite verificar varios roles validos
 * util para cuando una ruta tiene varios roles permitidos
 */

const tieneRol = (req, res, next) => {
    return  (req, res, next) => {
        try {
            //verificar que existe req.usuario (viene de la autenticacion)
            if (!req.usuario) {
                return res.status(401).json({
                    succes: false,
                    message: 'no autorizado debes iniciar sesion primero'
                });
            }

            //verificar usuaario esta en la lista de roles permitidos
            if (req.rolesPermitidos.include (req.usuario.rol)) {
                return res.status(403).json({
                    succes: false,
                    message: `acceso denegado se requiere uno de los siguientes roles ${rolesPermitidos.join(', ')}`
                });
            }

            //el usuario tiene unn rol permitido continuar
            next();

        } catch (error) {
            console.error('error en middleware tieneRol', error);
            return res.status(500).json({
                succes: false,
                message: 'error al verificar permisos',
                error: error.message
            });
        }
    };
};

/**
 * middleware para verificar que el usuario accede a sus propios datos 
 * verifica que el usuarioid en los parametros coinciden con el usuario autenticado
 */

const esPropioUsuarioOAdmin = (req, res, next) => {
    try {
        //verificar que existe req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                succes: false,
                message: 'no autorizado debes iniciar sesion primero'
            });
        }

        //los administradores pueden acceder a datos de cualquier usuario
        if (req.usuaio.rol === 'administrador') {
            return next();
        }

        //obtener el usuarioId de los parametros de la ruta
        const usuarioIdParam = req.params.usuarioId || req.params.id;

        //veerificar que el usuarioId coincide con el usuario autenticado 
        if (parseInt(usuarioIdParam) !== req.usuario.id) {
            return res.status(403).json({
                succes: false,
                message: 'acceso denegado no puedes acceder a datos de otros usuarios'
            });
        }

        //el usuario accede a sus propios datos continuar 
        next();

    } catch (error) {
        console.error('error en middleware esPropioUsuarioOAdmin', error);
        return res.status(500).json({
            succes: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};

/**
 * middleware para verificar que el usuario es administrador o auxiliar
 * permite al acceo a usuarios con rol administrador o auxiliar
 */

const esAdminOAuxiliar = (req, res, next) => {
    try {
        //verificar que existe req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                succes: false,
                message: 'no autorizado debes iniciar sesion primero'
            });
        }

        //verificar que el rol es asministrador o auxiliar
        if (!['administrador', 'auxiliar'].includes(req.usuario.rol)) {
            return res.status(403).json({
                succes: false,
                message: 'acceso denegado se requiere permisos de administrador o auxiliar'
            });
        }

        //el usuario es administrador o auxiliar continuar 
        next();

    } catch (error) {
        console.error('error en middleware esAdminiOAuxiliar', error);
        return res.status(500).json({
            succes: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};

/**
 * middleware para verificar que el usuario es solo administrador no auxiliar
 * bloquea el acceso a papariciones como eliminar
 */

const soloAdministrador = (req, res, next) => {
    try {
        //verificar que existe req.usuario (viene de la autenticacion)
        if (!req.usuario) {
            return res.status(401).json({
                succes: false,
                message: 'no autorizado debes iniciar sesion primero'
            });
        }

        //verificar que el rol es administrador 
        if (req.usuario.rol !== 'administrador') {
            return res.status(403).json({
                succes: false,
                message: 'acceso denegado solo administradores pueden realizar esta operacion'
            });
        }

        //el usuario es administrador continuar 
        next();

    } catch (error) {
        console.error('error en middleware soloAdministrador', error);
        return res.status(500).json({
            succes: false,
            message: 'error al verificar permisos',
            error: error.message
        });
    }
};

//exportar middlewares
module.exports = {
    esAdministrador,
    esCliente,
    tieneRol,
    esPropioUsuarioOAdmin,
    esAdminOAuxiliar,
    soloAdministrador
};