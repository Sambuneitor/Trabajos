/**
 * asociaciones entre modelos 
 * este archivo define todas las relaciones entre los modelos de sequelize
 * deje ejecutarse despues de importar los modelos 
 */

//importar todos los modelos 

const Usuario = require('./usuario');
const Categoria = require('./categoria');
const Subcategoria = require('./subcategoria');
const Producto = require('./producto');
const Carrito = require('./carrito');
const Pedido = require('./pedido');
const DetallePedido = require('./detallePedido');
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

Categoria.hasMany(Subcategoria, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'subcategoria', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar subcategorias
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar subcategorias
});

Subcategoria.belongsTo(Categoria, { 
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

Categoria.hasMany(Producto, { 
    foreignKey: 'categoriaId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una categoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza categoria actualizar producto
});

Producto.belongsTo(Categoria, { 
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

Subcategoria.hasMany(Producto, { 
    foreignKey: 'subcategoriaId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina una subcategoria eliminar producto
    onUpdate: 'CASCADE' //si se actualiza subcategoria actualizar producto
});

Producto.belongsTo(Subcategoria, { 
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

Usuario.hasMany(Carrito, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'carrito', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un usuario eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar carrito
});

Carrito.belongsTo(Usuario, { 
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

Producto.hasMany(Carrito, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'carrito', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un producto eliminar carrito
    onUpdate: 'CASCADE' //si se actualiza producto actualizar carrito
});

Carrito.belongsTo(Producto, { 
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

Usuario.hasMany(Pedido, { 
    foreignKey: 'usuarioId', //campo que conecta las tablas 
    as: 'pedidos', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un usuario no eliminar pedidos
    onUpdate: 'CASCADE' //si se actualiza usuario actualizar pedidos
});

Pedido.belongsTo(Usuario, { 
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

Pedido.hasMany(DetallePedido, { 
    foreignKey: 'pedidoId', //campo que conecta las tablas 
    as: 'detalles', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un pedido eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza pedido actualizar detalles
});

DetallePedido.belongsTo(Pedido, { 
    foreignKey: 'pedidoId', //campo que conecta las tablas 
    as: 'pedido', //alias para la relacion
    onDelete: 'CASCADE', //si se elimina un pedido eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza pedido actualizar detalles
});

/**
 * producto - detallePedido
 * un producto puede estar en muchos detalles
 * un detalle tiene un producto 
 */

Producto.hasMany(DetallePedido, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'detallesProducto', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un producto no eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza producto actualizar detalles
});

DetallePedido.belongsTo(Producto, { 
    foreignKey: 'productoId', //campo que conecta las tablas 
    as: 'producto', //alias para la relacion
    onDelete: 'RESTRICT', //si se elimina un producto no eliminar detalles
    onUpdate: 'CASCADE' //si se actualiza producto actualizar detalles
});

/**
 * relacion muchos a muchos: pedido y producto tiene una relacion muchos a muchos a traves de detalle de pedido
 */

Pedido.belongsToMany(Producto, { 
    through: 'detallePedido', //tabla intermedia
    foreignKey: 'pedidoId', // campo que conecta las tablas
    otherKey: 'productoId', // campo que conecta las tablas
    as: 'productos', //alias para la relacion
});

Producto.belongsToMany(Pedido, { 
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
    Usuario,
    Categoria,
    Subcategoria,
    Producto,
    Carrito,
    Pedido,
    DetallePedido,
    initAssociations
};