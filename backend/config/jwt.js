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
 * 
 * @param {String} token - token jwt a verificar
 * @returns {Object} datos decodificado si el token es valido
 * @throws {Error} si el token no es valido o ha expirado
 */

const extractTokenData = (tokenHeader) => {
    // verifica que el header existe y empieza con 'Bearer '
    if (authHeader && authHeader.startsWith('Bearer ')) {
        
    }
}