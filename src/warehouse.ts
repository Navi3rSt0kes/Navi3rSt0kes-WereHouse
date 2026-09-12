import { productos as coleccionProductos } from "./database.js";
import type { FiltrosBusqueda, ItemCarrito, Producto, ProductoEncontrado, ResultadoBusqueda, ResultadoReserva, ValidacionCarrito } from "./types.js";

let productos: Producto[] = [];
const reservas = new Map<string, ItemCarrito[]>();
let consecutivoReserva = 0;

export async function inicializar(): Promise<void> { productos = await coleccionProductos().find({}).toArray(); }

function normalizar(valor: string): string {
  return valor.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function tokens(valor: string): string[] { return normalizar(valor).split(" ").filter(Boolean); }

function coincideToken(campo: string, token: string): number {
  return tokens(campo).reduce((puntos, palabra) => puntos + (palabra === token ? 1 : palabra.startsWith(token) && token.length >= 4 ? 0.5 : 0), 0);
}

function puntaje(producto: Producto, consulta: string[]): number {
  return consulta.reduce((total, token) => total + coincideToken(producto.nombre, token) * 3 + producto.tags.reduce((n, tag) => n + coincideToken(tag, token) * 2, 0) + coincideToken(producto.categoria, token), 0);
}

function cumpleFiltros(producto: Producto, filtros: FiltrosBusqueda): boolean {
  return (!filtros.tagsRequeridos || filtros.tagsRequeridos.every((tag) => producto.tags.includes(tag)))
    && (!filtros.tagsExcluidos || filtros.tagsExcluidos.every((tag) => !producto.tags.includes(tag)))
    && (filtros.precioMax === undefined || producto.precioCop <= filtros.precioMax)
    && (!filtros.categoria || producto.categoria === filtros.categoria)
    && (!filtros.soloDisponibles || producto.stock > 0);
}

export function buscarProductos(query: string, filtros: FiltrosBusqueda = {}, topK = 5): ResultadoBusqueda {
  const consulta = tokens(query);
  const encontrados = productos
    .filter((producto) => cumpleFiltros(producto, filtros))
    .map((producto): ProductoEncontrado => ({ ...producto, disponible: producto.stock > 0, score: puntaje(producto, consulta) }))
    .filter((producto) => producto.score > 0)
    .sort((a, b) => b.score - a.score || a.precioCop - b.precioCop);
  return { resultados: encontrados.slice(0, topK), totalEncontrados: encontrados.length };
}

export function obtenerProducto(id: string): Producto | null { return productos.find((producto) => producto.id === id) ?? null; }
export function listarCatalogo(categoria?: string): Producto[] { return productos.filter((producto) => !categoria || producto.categoria === categoria); }
export async function crearProducto(producto: Producto): Promise<Producto | null> {
  if (obtenerProducto(producto.id)) return null;
  await coleccionProductos().insertOne(producto);
  productos.push({ ...producto });
  return producto;
}
export async function actualizarProducto(id: string, producto: Producto): Promise<Producto | null> {
  const indice = productos.findIndex((actual) => actual.id === id);
  if (indice === -1 || producto.id !== id) return null;
  await coleccionProductos().replaceOne({ id }, producto);
  productos[indice] = { ...producto };
  return productos[indice];
}
export async function eliminarProducto(id: string): Promise<Producto | null> {
  if ([...reservas.values()].some((items) => items.some((item) => item.id === id))) return null;
  const indice = productos.findIndex((producto) => producto.id === id);
  if (indice === -1) return null;
  const eliminado = productos.splice(indice, 1)[0];
  await coleccionProductos().deleteOne({ id });
  return eliminado;
}
export function categorias(): { categoria: string; conteo: number }[] {
  const conteos = new Map<string, number>();
  for (const producto of productos) conteos.set(producto.categoria, (conteos.get(producto.categoria) ?? 0) + 1);
  return [...conteos].map(([categoria, conteo]) => ({ categoria, conteo })).sort((a, b) => a.categoria.localeCompare(b.categoria));
}

export function sustitutos(id: string, topK = 3): Producto[] {
  const original = obtenerProducto(id);
  if (!original?.grupo) return [];
  return productos.filter((producto) => producto.id !== id && producto.grupo === original.grupo && producto.stock > 0)
    .sort((a, b) => Math.abs(a.precioCop - original.precioCop) - Math.abs(b.precioCop - original.precioCop) || a.precioCop - b.precioCop)
    .slice(0, topK);
}

function agruparItems(items: ItemCarrito[]): ItemCarrito[] {
  const cantidades = new Map<string, number>();
  for (const item of items) cantidades.set(item.id, (cantidades.get(item.id) ?? 0) + item.cantidad);
  return [...cantidades].map(([id, cantidad]) => ({ id, cantidad }));
}

export function validarCarrito(items: ItemCarrito[]): ValidacionCarrito {
  const disponibles: ValidacionCarrito["disponibles"] = [];
  const problemas: ValidacionCarrito["problemas"] = [];
  for (const item of agruparItems(items)) {
    const producto = obtenerProducto(item.id);
    if (!producto) { problemas.push({ id: item.id, nombre: "Producto no encontrado", motivo: "no_existe", stockDisponible: 0, cantidadPedida: item.cantidad, sustitutos: [] }); continue; }
    if (producto.stock < item.cantidad) {
      problemas.push({ id: producto.id, nombre: producto.nombre, motivo: producto.stock === 0 ? "agotado" : "stock_insuficiente", stockDisponible: producto.stock, cantidadPedida: item.cantidad, sustitutos: sustitutos(producto.id) });
      continue;
    }
    disponibles.push({ id: producto.id, nombre: producto.nombre, emoji: producto.emoji, presentacion: producto.presentacion, precioCop: producto.precioCop, cantidad: item.cantidad, subtotalCop: producto.precioCop * item.cantidad });
  }
  const totalCop = disponibles.reduce((total, item) => total + item.subtotalCop, 0);
  return { disponibles, problemas, totalCop, todoDisponible: problemas.length === 0 };
}

export async function reservar(items: ItemCarrito[]): Promise<ResultadoReserva> {
  const validacion = validarCarrito(items);
  if (!validacion.todoDisponible) return { ...validacion, reservada: false };
  const itemsAgrupados = agruparItems(items);
  await coleccionProductos().bulkWrite(itemsAgrupados.map((item) => ({ updateOne: { filter: { id: item.id }, update: { $inc: { stock: -item.cantidad } } } })));
  for (const item of itemsAgrupados) obtenerProducto(item.id)!.stock -= item.cantidad;
  const reservaId = `r${String(++consecutivoReserva).padStart(4, "0")}`;
  reservas.set(reservaId, itemsAgrupados);
  return { ...validacion, reservaId, reservada: true };
}

export async function confirmar(reservaId: string): Promise<{ reservaId: string; confirmada: boolean } | null> {
  if (!reservas.has(reservaId)) return null;
  reservas.delete(reservaId);
  return { reservaId, confirmada: true };
}

export async function liberar(reservaId: string): Promise<{ reservaId: string; liberada: boolean } | null> {
  const items = reservas.get(reservaId);
  if (!items) return null;
  await coleccionProductos().bulkWrite(items.map((item) => ({ updateOne: { filter: { id: item.id }, update: { $inc: { stock: item.cantidad } } } })));
  for (const item of items) obtenerProducto(item.id)!.stock += item.cantidad;
  reservas.delete(reservaId);
  return { reservaId, liberada: true };
}

export async function reset(): Promise<{ productos: number; mensaje: string }> { await inicializar(); reservas.clear(); consecutivoReserva = 0; return { productos: productos.length, mensaje: "Catálogo recargado desde MongoDB" }; }
