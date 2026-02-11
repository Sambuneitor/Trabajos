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
const fileFilter = (req, file, cb) => {
    //tipos mime permitidos para imagenes
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    //verifiicar si el tipo de archivo esta en la lista permitida
    if (allowedMimeTypes.includes(file.mimetype)) {
        //cb(null, true) -> aceptar archivo
        cb(null, true);
    } else {
        //cb(error) -> rechazar archivo con error
        cb(new Error('Solo se permiten imagenes (jpg, jpeg, png, gif).'), false);
    }
};

/**
 * cofigurar multer con las opciones definidas
 */

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        //limite de tamaño del archivo en bytes
        //por defecto 5MB (5 * 1024) 5242800 bytes
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242800
    }
});

/**
 * funcion para eliminar el archivo del servidor
 * util cuando se actualiza o elimina el producto
 * 
 * @param {String} filename - nombre del archivo a eliminar
 * @return {Boolean} true si se elimino correctamente, false si hubo un error
 */

const deleteFile = (filename) => {
    try {
        //construir la ruta completa del archivo
        const filePath = path.join(uploadPath, filename);

        //vrificar si el archivo existe
        if (fs.existsSync(filePath)) {
            //eliminar el archivo
            fs.unlinkSync(filePath);
            console.log(`Archivo eliminado: ${filename} `);
            return true;
        } else {
            console.log(`Archivo no encontrado: ${filename}`);
            return false;
        }
    } catch (error) {
        console.error(`Error al eliminar el archivo;`, error.message);
        return false;
    }
};

//exportar configuracion de multer y funcion de eliminacion
module.exports = {
    upload,
    deleteFile
};