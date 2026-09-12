import * as warehouse from "./warehouse.js";
import type { Producto } from "./types.js";

const ejemplo: Producto = { id: "demo-001", nombre: "Producto de prueba", categoria: "demo", presentacion: "Unidad", unidad: "unidad", contenido: 1, precioCop: 1000, stock: 2, grupo: "demo", emoji: "📦", tags: ["prueba"] };
console.log("1. catálogo inicial vacío", warehouse.listarCatalogo());
console.log("2. crear", warehouse.crearProducto(ejemplo));
console.log("3. buscar", warehouse.buscarProductos("prueba"));
console.log("4. actualizar", warehouse.actualizarProducto(ejemplo.id, { ...ejemplo, stock: 3 }));
console.log("5. eliminar", warehouse.eliminarProducto(ejemplo.id));
console.log("6. reset", warehouse.reset());
