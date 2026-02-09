/**configuracion de la db */

//importar sequelize
const {sequelize} = require('sequelize');

//importar dotenv para cariables de entorno 
require('dotenv').config();

//crear instancias de sequelize
const sequelize = new sequelize (
    Process.env.DB_NAME,
    Process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "mysql",

        //configuaraciones de pool de condiciones 

        pool: {
            max:5,
            min:0,
            acquire: 30000,
            idle:10000
        },
        //configuracion de loggin
        //permite ver la consultas de mysql por consola
        loggin: process.env.NODE_ENV === "development" ? console.log : false,

        //zona horaria
        timezone: '_05:00', //zona horaria de colombia

        //opciones adicionales
        define: {
            //timestamps: true crea autom los campos createdAT y updatedAT
            timestramps: true,

            //true usa snake_case para nombres de las columnas
            underscored: false,

            //true usa el nombre del modelo tal cual para la tabla 
            freezeTableName: true
        }
    }    
);

/*funcion para ptobar la conexion de la base de datos esta funcion de llamara al iniciar el server */
const testConnection = async () => {
    try{
        //intenta autenticar con la db
        await sequelize.authenticate(),
        console.log('conexion a mysql establecida correctamente');
        return true;
    } catch (error) {
        console.error('x error al conectar con myql:', error.message);
        console.error('verifica que xampp este corriendo y las credenciales en .env sean correctas');
        return false;
        
    }
}