/**
 * middleware de autenticacion JWT
 * este archivo verifica que el usuario tenga un token valido
 * se usa para las rutas protegidas que requieran autenticacion
 */

//importar funciones de JWT
const { extractToken, verifyToken } = require('../config/jwt');
//importar modelo de usuario
const Usuario = require("../models/usuario");


//middleware de autenticacion
const verificarAuth = async (req, res, next) => {
    try {
        //paso 1 obtener el token del header authorization
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'no se proporciono token de autenticacion'
            });
        }

        //extraer el token quitar bearer
        const token = extractToken(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'token de autenticacion invalido'
            });
        }

        //paso 2 verificar que el token es valido
        let decoded; //funcion para decodificar el token
        try {
            decoded = verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message //token expirado o invalido
            });
        }

        //buscar el usuario en la base de datos 
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }//no incluir la contraseña en la respuesta
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'usuario no encontrado'
            });
        }

        //paso 4 verificar que el usuario esta activo
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                message: 'usuario inactivo contacte al administrador'
            });
        }

        //paso 5 agregar el usuario al objeto req para uso posterior
        //ahora en los controladores podemos acceder a req.usuario
        req.usuario = usuario;

        //continuar con el siguiente
        next();

    } catch (error) {
        console.error ('error en middleware de autenticacion', error);
        return res.status(500).json({
            success: false,
            message: 'error en la verificacion',
            error: error.message
        })
    }
};

/**
 * middleware opcional de autenticacion
 * similar a verificarAuth pero no retorna error si no hay token
 * es para rutas q no reqieren autenticacion
 */

const verificarAuthOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        //si no hay token continuar sin usuario
        if (!authHeader) {
            req.usuario = null;
            return next();
        }

        const token = extractToken(authHeader);

        if (!token) {
            req.usuario = null;
            return next();
        }

        try {
            const decoded = verifyToken(token);
            const usuario = await Usuario.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }
            });

            if (usuario && usuario.activo) {
                req.usuario = usuario;
            } else {
                req.usuario = null;
            }
        } catch (error) {
            //token invalido o expirado continuar sin usuario
            req.usuario = null;
        }

        next();
    } catch (error) {
        console.error('error en middleware de autenticacion opcional', error);
        req.usuario = null;
        next();
    }
};

//exportar middleware
module.exports = {
    verificarAuth,
    verificarAuthOpcional
}