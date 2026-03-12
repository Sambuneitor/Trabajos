/**
 * SERVIDOR PRINCIPAL DEL BACKEND
 * este es el archivo principal del servidor del backend
 * condigura express, middleware, rutas y conexion de base de datos
 */

//importaciones

//importar express para crear el server
const express = require('express');

//importar cors para permitir solicitudes desde el frontend
const cors = require('cors');

//importar path para manejar rutas de archivos
const path = require('path');

//importar dorenv para manejar variables de entorno
require('dotenv').config();

//importar cofiguracion de la base de datos
const dbConfig = require('./config/database');

//importar modelos y adsociaciones
const { initAssociations } = require('./models')

//importar seeders
const { runSeeders } = require('./seeders/adminSeeder');

//crear aplicaciones express
const app = express();

//obtener el puerto desde la variable de entorno
const PORT = process.env.PORT || 5000;

//middlewares globales

//cors permite peticiones dese el frontend
//configura que los dominios pueden hacer periciones al backend

app.use (cors ({
    origin: process.env.FRONDEND_URL || 'http://localhost:3000', ///url del frontend
    credentials: true, // permitir enviar cookies 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], //metodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // encabezados permitidos
}));

/**
 * express.json() - parse el body de las peticiones en fomaro JSON
 */

app.use(express.json());

/**
 * express.urlencoded() pasar el body de los formularios
 * las imagenes estaran disponibles
 */

app.use(express.urlencoded({ extended: true}));

/**
 * servir archivos estaticos imagenes desde la carpeta raiz
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//middleware para loggin de peticiones
//muestra en consola cada peticion que llega al server

if(process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`ok ${req.method} ${req.path}`);
        next();
    });
}

//rutas

//rutas raiz verificar que el servidor esta corriendo

app.get('/,', (req, res) => {
    res.json({
        success: true,
        message: 'servidor E-commerce Backend corriendo correctamente',
        version: '1.0.0',
        timeStamp: new Date().toISOString()
    });
});

//ruta de salud verifica que el servidor como esta
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        database: 'conected',
        timeStamp: new Date().toISOString()
    });
});

//rutas api

//rutas de autenticacion
//incluye registro login, perfil

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

//rutas del administrador
//requieren autenticacion y rol de administrador

const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

//rutas del cliente

const clienteRoutes = require('./routes/clientes.routes');
app.use('/api', clienteRoutes);

//manejo de rutas no encontradas (404)

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'ruta no encontrada',
        path: req.path,
    });
});

//manejo de errores globales

app.use((err, req, res, next) => {
    console.error('error:', err.message);
    //error de multer subida de archivos
    if (err.name === 'multerError') {
        return res.status(400).json({
            success: false,
            message: 'error al subir el archivo',
            error: err.message
        });
    }

    //otros errores
    res.status(500).json({
        success: false,
        message: err.message || 'error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

//inicializar servidor  y base de datos

/**
 * funcion principal para iniciar el servidor
 * prueba la conexion a MySQL
 * sincroniza los modelos (crea las tablas)
 * inicia el servidor express
 */

const startServer = async () => {
    try {
        //paso 1 probar conexion a MySQL
        console.log(' conectado a MySQL...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('no se pudo conectar a MySQL verificar XAMPP y el archivo .env');
            process.exit(1); //salir si no hay conexion
        }

        //paso 2 sincronizar modelos (crear tablas)
        console.log('sincronizando modelos con la base de datos...');

        //inicializar asocioaciones entre los modelos
        initAssociations();

        //en desarrollo alter puede ser true para actualizar la estructura
        //en produccion debe ser false para no perder los datos
        const alterTables = process.env.NODE_ENV === 'development';
        const dbSynced = await syncDataBase(false, alterTables);

        if (!dbSynced) {
            console.error('x error al sincronizar la base de datos');
            process.exit(1);
        }

        //paso 3 ejecutar seeders datos iniciales 
        await runSeeders();

        //paso 4 iniciar servidor express
        app.listen(PORT, () => {
            console.log(`\n ___________________`);
            console.log(`servidor corriendo en el puerto ${PORT}`);
            console.log(`URL http://localhost:${PORT}`);
            console.log(`base de datos ${process.env.NODE_ENV}`);
            console.log('servidor listo para realizar peticiones');
        });
    } catch (error) {
        console.error('x error fatal al iniciar el servidor:', error.message);
        process.exit(1);
    }
};

//manejo de cierre 
//captura el ctrl+c para cerrar el servidor correctamente

process.on('SIGINT', () => {
    console.log('\n\n cerrando servidor...');
    process.exit(0);
});

//capturar errores no manejador 

process.on('unhandledRejection', (err) => {
    console.error('x error no menejado', err);
    process.exit(1);
});

//iniciar servidor
startServer();

//exportar app para testing
module.exports = app;