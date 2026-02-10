/**
 * config de subida de archivos
 * 
 * es un middleware para manejarn la subida de archivos 
 * este archivo configura como y donde se guardan las imagenes
 */

// importar multer para manejar archivos
const multer = require('multer');

// importar path para trabajar con rutas de archivos
const path = require('path');

//  importar fs para verificar  /crear directorios
const fs = require('fs');

// importar dotenv para cargar variables de entorno
require('dotenv').config();

// obtener la ruta donde se guardan los archivos
const uploadPath = process.env.UPLOAD_DIR || './uploads';

//verificar si la carpeta uploads existe, si no, crearla
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`carpeta ${uploadPath} creada`);
}

/**
 * confihuracion de almacenamiento de multer
 * define donde y como se guardaran los archivos
 */

const storage = multer.diskStorage({
    /**
     * destination: define la carpeta donde se guardaran los archivos
     * 
     * @param {Object} req - objeto de la peticion http
     * @param {Object} file - archivo que esta subiendo 
     * @param {Function} cb - callback que se llama (error, destination)
     */
    destination: function (req, file, cb) {
        //cb(null, ruta) -> sin error, ruta = carpeta de destino
        cb(null, uploadPath);
    },

    /**
     * filename: define el nombre con el que se guardara el archivo
     * formato: timestamp-nombreoriginal.ext
     * 
     * @param {Object} req - objeto de la peticion http
     * @param {Object} file - archivo que se esta subiendo 
     * @param {Function} cb - callback que se llama con (error, filename)
     */
    filename: function (req, file, cb) {
        //genera nombre unico usando timestamp + nombre original
        //date.now() genera un timestamp unico
        //path.extname() extrae la extension del archivo a(.jpg, .png, etc)
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    } 
});

/**
 * filtro para validar el tipo de archivo
 * solo permite imagenes (jpg, jpeg, png, gif)
 * 
 * @param {Object} req - objeto de la peticion http
 * @param {Object} file - archivo que se esta subiendo 
 * @param {Function} cb - callback que se llama con (error, acceptfile)
 */