/** rutas del cliente
 * rutas publicas y para los clientes autenticados
 */

const express = require('express');
const router = express.Router();

//importar los middlewares
const { verificarAuth } = require('../middleware/auth');
const { esCliente } = require('../middleware/checkRole');


//importar controladores
const catalogoController = require('../controllers/catalogo.controller');
const carritoController = require('../controllers/carrito.controller');
const pedidoController = require('../controllers/pedido.controller');


//rutas publicas catalogo
//GET /api/catalogo/productos
router.get('/catalogo/productos', catalogoController.getProductos);

//GET /api/catalogo/productos/:id
router.get('/catalogo/productos/:id', catalogoController.getProductoById);

//GET /api/catalogo/categorias
router.get('/catalogo/categorias', catalogoController.getCategorias);

//GET /api/catalogo/categorias/:id/subcategorias
router.get('/catalogo/categorias/:id/subcategorias', catalogoController.getSubcategoriasPorCategorias);

//GET /api/catalogo/destacados
router.get('/catalogo/destacados', catalogoController.getProductosDestacados);


//rutas del carrito
//GET /api/cliente/carrito
router.get('/cliente/carrito', verificarAuth, carritoController.getCarrito);

//POST /api/cliente/carrito
router.post('/cliente/carrito', verificarAuth, carritoController.agregarAlCarrito);

//PUT /api/cliente/carrito/:id
router.put('/cliente/carrito/:id', verificarAuth, carritoController.actualizarItemCarrito);

//DELETE /api/cliente/carrito/:id
//eliminar un item del carrito
router.delete('/cliente/carrito/:id', verificarAuth, carritoController.eliminarItemCarrito);

//DELETE /api/cliente/carrito/:id
//vaciar carrito
router.delete('/cliente/carrito', verificarAuth, carritoController.vaciarCarrito);


//rutas de pedidos -cliente
//POST /api/cliente/pedidos
router.post('/cliente/pedidos', verificarAuth, pedidoController.crearPedido);

//GET /api/cliente/pedidos
router.get('/cliente/pedidos', verificarAuth, pedidoController.getMisPedidos);

//GET /api/cliente/pedidos/:id
router.get('/cliente/pedidos/:id', verificarAuth, pedidoController.getPedidoById);

//PUT /api/cliente/pedidos/:id/cancelar
router.put('/cliente/pedidos/:id/cancelar', verificarAuth, pedidoController.cancelarPedido);


module.exports = router;