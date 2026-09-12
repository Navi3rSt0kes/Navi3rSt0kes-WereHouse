# Servicio de Inventario

API Fastify para el supermercado agéntico. Requiere Node.js 20+.

```bash
npm install
npm run dev
```

Queda disponible en `http://localhost:8000`. Para comprobar la lógica sin HTTP:

```bash
npm run smoke
```

El catálogo inicia vacío. El CRUD (`POST`, `PUT` y `DELETE /productos`) escribe en `data/products.json` y mantiene la copia en memoria sincronizada. `POST /admin/reset` vuelve a cargar ese archivo.

## Contrato para frontend

```json
{
  "GET /buscar?q=producto&precioMax=20000&soloDisponibles=true": {
    "resultados": [{"id":"id-real","nombre":"Producto encontrado","precioCop":14900,"stock":12,"disponible":true,"score":5}],
    "totalEncontrados": 1
  },
  "POST /carrito/validar": {
    "request": {"items":[{"id":"id-real","cantidad":2}]},
    "response": {"disponibles":[{"id":"id-real","nombre":"Producto","emoji":"📦","presentacion":"Unidad","precioCop":14900,"cantidad":2,"subtotalCop":29800}],"problemas":[],"totalCop":29800,"todoDisponible":true}
  },
  "GET /productos?categoria=carnes": [{"id":"id-real","nombre":"Producto","categoria":"carnes","presentacion":"Unidad","unidad":"g","contenido":500,"precioCop":14900,"stock":12,"grupo":"grupo","emoji":"📦","tags":["tag"]}]
}
```
