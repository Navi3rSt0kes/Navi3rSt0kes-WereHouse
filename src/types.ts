export interface Producto { id: string; nombre: string; categoria: string; presentacion: string; unidad: string; contenido: number; precioCop: number; stock: number; grupo: string; emoji: string; tags: string[] }
export interface FiltrosBusqueda { tagsRequeridos?: string[]; tagsExcluidos?: string[]; precioMax?: number; categoria?: string; soloDisponibles?: boolean }
export interface ProductoEncontrado extends Producto { disponible: boolean; score: number }
export interface ResultadoBusqueda { resultados: ProductoEncontrado[]; totalEncontrados: number }
export interface ItemCarrito { id: string; cantidad: number }
export interface ItemDisponible { id: string; nombre: string; emoji: string; presentacion: string; precioCop: number; cantidad: number; subtotalCop: number }
export interface ProblemaCarrito { id: string; nombre: string; motivo: "agotado" | "stock_insuficiente" | "no_existe"; stockDisponible: number; cantidadPedida: number; sustitutos: Producto[] }
export interface ValidacionCarrito { disponibles: ItemDisponible[]; problemas: ProblemaCarrito[]; totalCop: number; todoDisponible: boolean }
export interface ReservaExitosa extends ValidacionCarrito { reservaId: string; reservada: true }
export interface ReservaFallida extends ValidacionCarrito { reservada: false }
export type ResultadoReserva = ReservaExitosa | ReservaFallida
export interface RespuestaReserva { reservaId: string; confirmada?: boolean; liberada?: boolean }
