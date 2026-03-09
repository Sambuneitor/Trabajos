/** rutas del administrador
 * agrupa todas las rutas de gestion del admin
 */

const express = require('express');
const router = express.Router();

//importar los middlewares
const { verificarAuth } = require('../middleware/auth');
const { esAdministrador, esAdminOAuxiliar, soloAdministrador } = require('../middleware/checkRole');

//importar configuracion de multer para la subida de imagenes
const { upload } = require('../config/multer');

//importar controladores
const categoriaController = require('../controllers/categoria.controller');
const subcategoriaController = require('../controllers/subcategoria.controller');
const productoController = require('../controllers/producto.controller');
const usuarioController = require('../controllers/usuario.controller');
const pedidoController = require('../controllers/pedido.controller');

//restricciones de acceso a las rutas del admin
router.use(verificarAuth, esAdminOAuxiliar);

//rutas de categorias
//get /api/admin/categorias
router.get('/categorias', categoriaController.getCategorias);

//get /api/admin/categoria/:id
router.get('/categorias/:id', categoriaController.getCategoriasById);

//get /api/admin/categoria/:id/stats
router.get('/categorias/:id/stats', categoriaController.getEstadisticasCategoria);

//POST /api/admin/categorias
router.post('/categorias', categoriaController.crearCategoria);

//PUT /api/admin/categorias
router.put('/categorias/:id', categoriaController.actualizarCategoria);

//PATCH /api/admin/categorias:id/toggle desactivar o activar categoria
router.patch('/categorias/:id/toggle', categoriaController.toggleCategoria);

//delete /api/admin/categorias
router.delete('/categorias/:id', soloAdministrador, categoriaController.eliminarCategoria);


//rutas de subcategorias
//get /api/admin/subcategorias
router.get('/subcategorias', subcategoriaController.getSubcategorias);

//get /api/admin/subcategoria/:id
router.get('/subcategorias/:id', subcategoriaController.getSubcategoriasById);

//get /api/admin/subcategoria/:id/stats
router.get('/subcategorias/:id/stats', subcategoriaController.getEstadisticasSubcategoria);

//POST /api/admin/subcategorias
router.post('/subcategorias', subcategoriaController.crearSubcategoria);

//PUT /api/admin/subcategorias
router.put('/subcategorias/:id', subcategoriaController.actualizarSubcategoria);

//PATCH /api/admin/subcategorias:id/toggle desactivar o activar subcategoria
router.patch('/subcategorias/:id/toggle', subcategoriaController.toggleSubcategoria);

//delete /api/admin/subcategorias
router.delete('/subcategorias/:id', soloAdministrador, subcategoriaController.eliminarSubcategoria);


//rutas de producto
//get /api/admin/producto
router.get('/producto', productoController.getProductos);

//get /api/admin/producto/:id
router.get('/producto/:id', productoController.getProductoById);

//POST /api/admin/producto
router.post('/producto', productoController.crearProducto);

//PUT /api/admin/producto
router.get('/producto/:id', productoController.actualizarProducto);

//PATCH /api/admin/producto:id/toggle desactivar o activar producto
router.patch('/producto:/:id/toggle', productoController.toggleProducto);

//PATCH /api/admin/producto:id/stock
router.patch('/producto:/:id/stock', productoController.actualizarStock);

//delete /api/admin/producto
router.delete('/producto/:id', soloAdministrador, productoController.eliminarProducto);
