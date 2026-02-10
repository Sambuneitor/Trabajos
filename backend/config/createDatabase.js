/**
 * script de inializacion de la db
 * este crea la db si no existe
 * sebe ejecitarse una sola vez antes de iniciar el server
 */

// importar mysql2 para la construccion directa
const mysql = require('mysql2/promise');

// importar dontev para cargar las variables de entorno
require('dotenv').config();

// funcion para crear la db
const createDatabase = async () => {
    let connection;

    try {
        console.log('iniciando conexion a db ... \n');
        
        // crear conexion a mysql sin especificar la db
        console.log('conectando a mysql ... \n');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('conexion a mysql establecida \n');

        // crear la db si no existe
        const dbName = process.env.DB_NAME || 'ecommerce_db';
        console.log(`creando la base de datos ${dbName}... \n`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`'${dbName}' 
        creada/verificada correctamente\n`);

        //cerrar la conexion
        await connection.end();

        console.log('¡proceso completado! ahora puedes iniciar el server con: npm start\n');
    } catch (error) {
        console.error('error al crear la base de datos:', error.message);
        console.error('verifica que:');
        console.error('1. xampp esta corriendo');
        console.error('2. mysql este iniciado en xampp');
        console.error('3. las credenciales en el .env sean correctas');

        if (connection) {
            await connection.end();
        }

        process.exit(1);
    }
};

// ejecutar la funcion
createDatabase();