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
//GET /api/admin/categorias
router.get('/categorias', categoriaController.getCategorias);

//GET /api/admin/categoria/:id
router.get('/categorias/:id', categoriaController.getCategoriasById);

//GET /api/admin/categoria/:id/stats
router.get('/categorias/:id/stats', categoriaController.getEstadisticasCategoria);

//POST /api/admin/categorias
router.post('/categorias', categoriaController.crearCategoria);

//PUT /api/admin/categorias
router.put('/categorias/:id', categoriaController.actualizarCategoria);

//PATCH /api/admin/categorias/:id/toggle desactivar o activar categoria
router.patch('/categorias/:id/toggle', categoriaController.toggleCategoria);

//DELETE /api/admin/categorias/:id
router.delete('/categorias/:id', soloAdministrador, categoriaController.eliminarCategoria);


//rutas de subcategorias
//GET /api/admin/subcategorias
router.get('/subcategorias', subcategoriaController.getSubcategorias);

//GET /api/admin/subcategoria/:id
router.get('/subcategorias/:id', subcategoriaController.getSubcategoriasById);

//GET /api/admin/subcategoria/:id/stats
router.get('/subcategorias/:id/stats', subcategoriaController.getEstadisticasSubcategoria);

//GET /api/admin/subcategorias
router.post('/subcategorias', subcategoriaController.crearSubcategoria);

//PUT /api/admin/subcategorias
router.put('/subcategorias/:id', subcategoriaController.actualizarSubcategoria);

//PATCH /api/admin/subcategorias/:id/toggle desactivar o activar subcategoria
router.patch('/subcategorias/:id/toggle', subcategoriaController.toggleSubcategoria);

//DELETE /api/admin/subcategorias/:id
router.delete('/subcategorias/:id', soloAdministrador, subcategoriaController.eliminarSubcategoria);


//rutas de producto
//GET /api/admin/producto
router.get('/producto', productoController.getProductos);

//GET /api/admin/producto/:id
router.get('/producto/:id', productoController.getProductoById);

//POST /api/admin/producto
router.post('/producto', productoController.crearProducto);

//PUT /api/admin/producto/:id
router.put('/producto/:id', productoController.actualizarProducto);

//PATCH /api/admin/producto/:id/toggle desactivar o activar producto
router.patch('/producto:/:id/toggle', productoController.toggleProducto);

//PATCH /api/admin/producto/:id/stock
router.patch('/producto:/:id/stock', productoController.actualizarStock);

//DELETE /api/admin/producto/:id
router.delete('/producto/:id', soloAdministrador, productoController.eliminarProducto);


//rutas de usuario
//GET /api/admin/usuario/:id/stats
router.get('/usuarios/:id/stats', usuarioController.getEstadisticasUsuarios);

//GET /api/admin/usuario
router.get('/usuarios', usuarioController.getUsuarios);

//GET /api/admin/usuario/:id
router.get('/usuarios/:id', usuarioController.getUsuarioById);

//POST /api/admin/usuario
router.post('/usuarios', soloAdministrador, usuarioController.crearUsuario);

//PUT /api/admin/usuario/:id
router.put('/usuarios/:id', soloAdministrador, usuarioController.actualizarUsuario);

//PATCH /api/admin/usuario/:id/toggle desactivar o activar usuario
router.patch('/usuarios:/:id/toggle', soloAdministrador, usuarioController.toggleUsuario);

//DELETE /api/admin/usuario/:id
router.delete('/usuarios:/:id', soloAdministrador, usuarioController.eliminarUsuario);



//rutas de pedido
//GET /api/admin/pedidos
router.get('/pedidos', pedidoController.getAllPedidos);

//GET /api/admin/pedidos/:id
router.get('/pedidos/:id', pedidoController.getPedidoById);

//GET /api/admin/pedidos/stats
router.get('/pedidos/stats', pedidoController.getEstadisticasPedidos);

//PUT /api/admin/pedidos/:id/estado
router.put('/pedidos/:id/estado', pedidoController.actualizarEstadoPedido);

module.exports = router;