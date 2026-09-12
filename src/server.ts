import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import * as warehouse from "./warehouse.js";

const app = Fastify({ logger: true });
const itemSchema = z.object({ id: z.string().min(1), cantidad: z.coerce.number().int().positive() });
const productoSchema = z.object({ id: z.string().min(1), nombre: z.string().min(1), categoria: z.string().min(1), presentacion: z.string().min(1), unidad: z.string().min(1), contenido: z.coerce.number().nonnegative(), precioCop: z.coerce.number().int().nonnegative(), stock: z.coerce.number().int().nonnegative(), grupo: z.string(), emoji: z.string().min(1), tags: z.array(z.string()) });
const filtrosSchema = z.object({ q: z.string().min(1), tagsRequeridos: z.string().optional(), tagsExcluidos: z.string().optional(), precioMax: z.coerce.number().int().nonnegative().optional(), categoria: z.string().optional(), soloDisponibles: z.coerce.boolean().optional(), topK: z.coerce.number().int().positive().max(50).optional() });
const paramsId = z.object({ id: z.string().min(1) });

await app.register(cors, { origin: ["http://localhost:5173", "http://localhost:3000"], credentials: false });
app.setErrorHandler((error, _request, reply) => {
  const statusDeclarado = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
  const status = error instanceof z.ZodError ? 400 : (statusDeclarado && statusDeclarado < 500 ? statusDeclarado : 500);
  const mensaje = error instanceof Error ? error.message : "Solicitud inválida";
  reply.status(status).send({ error: status === 500 ? "Error interno del servidor" : mensaje });
});
app.get("/health", () => ({ estado: "ok" }));
app.get("/productos", (request) => { const query = z.object({ categoria: z.string().optional() }).parse(request.query); return warehouse.listarCatalogo(query.categoria); });
app.post("/productos", (request, reply) => { const producto = productoSchema.parse(request.body); const creado = warehouse.crearProducto(producto); return creado ? reply.status(201).send(creado) : reply.status(409).send({ error: "Ya existe un producto con ese id" }); });
app.get("/categorias", () => warehouse.categorias());
app.get("/productos/:id", (request, reply) => { const { id } = paramsId.parse(request.params); const producto = warehouse.obtenerProducto(id); return producto ?? reply.status(404).send({ error: "Producto no encontrado" }); });
app.put("/productos/:id", (request, reply) => { const { id } = paramsId.parse(request.params); const producto = productoSchema.parse(request.body); const actualizado = warehouse.actualizarProducto(id, producto); return actualizado ? actualizado : reply.status(404).send({ error: "Producto no encontrado o id no coincide" }); });
app.delete("/productos/:id", (request, reply) => { const { id } = paramsId.parse(request.params); const eliminado = warehouse.eliminarProducto(id); return eliminado ? eliminado : reply.status(404).send({ error: "Producto no encontrado o asociado a una reserva" }); });
app.get("/buscar", (request) => { const query = filtrosSchema.parse(request.query); return warehouse.buscarProductos(query.q, { tagsRequeridos: query.tagsRequeridos?.split(",").filter(Boolean), tagsExcluidos: query.tagsExcluidos?.split(",").filter(Boolean), precioMax: query.precioMax, categoria: query.categoria, soloDisponibles: query.soloDisponibles }, query.topK); });
app.get("/productos/:id/sustitutos", (request) => { const { id } = paramsId.parse(request.params); const { topK } = z.object({ topK: z.coerce.number().int().positive().max(50).optional() }).parse(request.query); return warehouse.sustitutos(id, topK); });
app.post("/carrito/validar", (request) => warehouse.validarCarrito(z.object({ items: z.array(itemSchema) }).parse(request.body).items));
app.post("/carrito/reservar", (request) => warehouse.reservar(z.object({ items: z.array(itemSchema) }).parse(request.body).items));
app.post("/reservas/:id/confirmar", (request, reply) => { const resultado = warehouse.confirmar(paramsId.parse(request.params).id); return resultado ?? reply.status(404).send({ error: "Reserva no encontrada" }); });
app.post("/reservas/:id/liberar", (request, reply) => { const resultado = warehouse.liberar(paramsId.parse(request.params).id); return resultado ?? reply.status(404).send({ error: "Reserva no encontrada" }); });
app.post("/admin/reset", () => warehouse.reset());

app.listen({ port: 8000, host: "0.0.0.0" }).catch((error) => { app.log.error(error); process.exit(1); });
