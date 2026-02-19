/**
 * asociaciones entre modelos 
 * este archivo define todas las relaciones entre los modelos de sequelize
 * deje ejecutarse despues de importar los modelos 
 */

//importar todos los modelos 

const usuario = require('./usuario');
const categoria = require('./categoria');
const subcategoria = require('./subcategoria');
const producto = require('./producto');
const carrito = require('./carrito');
const pedido = require('./pedido');
const detallePedido = require('./detallePedido');
const { PassThrough } = require('stream');

/**
 * definir asociaciones
 * tipos de relaciones sequelize:
 * hasone 1-1
 * belongsto 1-1 
 * hasmany 1-N
 * belongstomany N-N
 */

/**
 * categoria - subcategoria
 * una categoria tiene muchas subcategorias 
 * una subcategoria pertenece a una categoria 
 */

categoria.hasMany(subcategoria, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'subcategoria', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar subcategorias
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar subcategorias
});

subcategoria.belongsTo(categoria, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'categoria', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar subcategorias
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar subcategorias
});

/**
 * categoria - producto
 * una categoria tiene muchos productos 
 * un producto pertenece a una categoria
 */

categoria.hasMany(producto, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar producto
});

producto.belongsTo(categoria, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'categoria', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar producto
});

/**
 * subcategoria - producto
 * una subcategoria tiene muchos productos 
 * un producto pertenece a una subcategoria
 */

subcategoria.hasMany(producto, { 
    foreignKey: 'subcategoriaId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una subcategoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza subcategoria actualizar producto
});

producto.belongsTo(subcategoria, { 
    foreignKey: 'subcategoriaId', //campo que conecta las tablas 
    as: 'subcategoria', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una subcategoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza subcategoria actualizar producto
});

/**
 * usuario - carrito
 * un usuario tiene muchos carritos 
 * un carrito pertenece a un usuario 
 */

usuario.hasMany(carrito, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'carrito', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un usuario eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar carrito
});

carrito.belongsTo(usuario, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'usuario', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un usuario eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar carrito
});

/**
 * producto - carrto
 * un producto tiene muchos carritos 
 * un carrito pertenece a un producto 
 */

producto.hasMany(carrito, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'carrito', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un producto eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza producto actualizar carrito
});

carrito.belongsTo(producto, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un producto eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza producto actualizar carrito
});

/**
 * usuario - pedido
 * un usuario tiene muchos pedidos  
 * un pedido pertenece a un usuario 
 */

usuario.hasMany(pedido, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'pedidos', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un usuario no eliminar pedidos
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar pedidos
});

pedido.belongsTo(usuario, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'usuario', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un usuario no eliminar pedidos
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar pedidos
});

/**
 * pedido - detallePedido
 * un pedido tiene muchos detalles
 * un detalle pertenece a un pedido 
 */

pedido.hasMany(detallePedido, { 
    foreignKey: 'pedidoId', //campo que conecta las tablas 
    as: 'detallePedido', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un pedido eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza pedido actualizar detalles
});

detallePedido.belongsTo(pedido, { 
    foreignKey: 'pedidoId', //campo que conecta las tablas 
    as: 'pedidos', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un pedido eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza pedido actualizar detalles
});

/**
 * producto - detallePedido
 * un producto puede estar en muchos detalles
 * un detalle tiene un producto 
 */

producto.hasMany(detallePedido, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'detallePedido', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un producto no eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza producto actualizar detalles
});

detallePedido.belongsTo(producto, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un producto no eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza producto actualizar detalles
});

/**
 * relacion muchos a muchos: pedido y producto tiene una relacion muchos a muchos a traves de detalle de pedido
 */

pedido.belongsToMany(producto, { 
    through: 'detallePedido', //tabla intermedia
    foreignKey: 'pedidoId', // campo que conecta las tablas
    otherKey: 'productoId', // campo que conecta las tablas
    as: 'productos', //alias para la relacion
});

producto.belongsToMany(pedido, { 
    through: 'detallePedido', //tabla intermedia
    foreignKey: 'productoId', //campo que conecta las tablas 
    otherKey: 'pedidoId', //campo que conecta las tablas
    as: 'pedidos', //alias para la relacion
});

/**
 * exportar funcion de inicializacion 
 * funcion para inicializar todas lsa asociaciones 
 * se llama desde server.js despues de cargar los modelos
 */
const initAssociations = () => {
    console.log('asociaciones entre los modelos establecidas correctamente');
};

//exportar los modelos
module.exports = {
    usuario,
    categoria,
    subcategoria,
    producto,
    carrito,
    pedido,
    detallePedido,
    initAssociations
};