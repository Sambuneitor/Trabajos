//**
// configuracion de jwt
// este archivo contiene funciones para generar y verificar tokens jwt
// se usan para autenticar sin necesidad de sesiones
//*/

// importar jsonwebtoken para manejar los tokens
const jwt = require('jsonwebtoken');

// importar dotenv para acceder a las variables de entorno
require('dotenv').config();

/**
 * generar un token jwt para un usuario
 * 
 * @param {Object} playload - datos que se incluiran en el token (id, email, rol)
 * @returns {String} token jwt generado
 */

const generateToken = (payload) => {
    try {
        // jwt.sign() crea u firma un token
        // parametros:
        //1. payload: datos que se incluiran en el token
        //2. secret: clave secreta para firmar el token (desde .env)
        //3. options: opciones adicionales (ej: expiracion)
        const token = jwt.sign(
            payload, // datos del usuario
            process.env.JWT_SECRET, // clave secreta desde .env
            { expiresIn: process.env.JWT_EXPIRES_IN } // tiempo de expiracion
        );

        return token;
    } catch (error) {
        console.error('error al generar el token JWT:', error.message);
        throw new Error('Error al generar el token de autenticacion');
    }   
};

/**
 * verificar si un token es valido
 * 01
 * @param {String} tokenHeader - token jwt a verificar
 * @returns {Object} datos decodificado si el token es valido
 * @throws {Error} si el token no es valido o ha expirado
 */

const verifyToken = (tokenHeader) => {
    try {
        //jwt.verify() verifica la firma del token y decodifica
        //parametros:
        //1. token: el token jwt a verificar
        //2. secret: la misma clave secreta usada para firmarlo
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
        }catch (error) {

          //diferentes tipos de errores
          if (error.name === 'TokenExpiredError') {
            throw new Error('El token ha expirado');
            } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Token invalido');
            } else {
                throw new Error('Error al verificar el token');
      }
    }
};

/**
 * extraer el token de un header de autorizacion
 * el token viene en formato 'Bearer <token>'
 * 
 * @param {String} authHeader - header de autorizacion de la peticion
 * @returns {String|null} el token extraido o null si no existe
 */

const extractToken = (authHeader) => {
    // verifica que el header existe y empieza con 'Bearer '
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // extraer solo el token (quitar 'Bearer ')
        return authHeader.substring(7);
    }

    return null; // no se encontro un token valido
};

//exportar las funciones para usarlas en otras partes del proyecto
module.exports = {
    generateToken,
    verifyToken,
    extractToken
};