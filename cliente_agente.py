"""Cliente autocontenido del servicio de inventario para function calling."""
import os
from typing import Any
import requests

BASE_URL = os.getenv("WAREHOUSE_URL", "http://localhost:8000").rstrip("/")

TOOLS = [
    {"type": "function", "function": {"name": "buscar_productos", "description": "Busca productos reales del inventario. Úsala para identificar IDs, precios, stock y opciones a partir de una necesidad del usuario. Nunca inventes IDs ni precios; si hay una restricción, pásala como tags_requeridos. Antes de mostrar un carrito final debes llamar validar_carrito.", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Producto o necesidad a buscar"}, "tags_requeridos": {"type": "array", "items": {"type": "string"}, "description": "Etiquetas obligatorias, por ejemplo sin_gluten"}, "tags_excluidos": {"type": "array", "items": {"type": "string"}}, "precio_max": {"type": "integer"}, "categoria": {"type": "string"}, "solo_disponibles": {"type": "boolean"}, "top_k": {"type": "integer"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "sustitutos", "description": "Obtiene sustitutos disponibles para un ID real. Úsala si un producto está agotado o si validar_carrito devuelve problemas; ofrece las alternativas que devuelve.", "parameters": {"type": "object", "properties": {"id": {"type": "string"}, "top_k": {"type": "integer"}}, "required": ["id"]}}},
    {"type": "function", "function": {"name": "validar_carrito", "description": "Valida el carrito usando IDs y cantidades reales ANTES de mostrárselo al usuario. Si hay problemas, ofrece los sustitutos devueltos. El total que devuelve es la única fuente válida de precio.", "parameters": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}, "cantidad": {"type": "integer", "minimum": 1}}, "required": ["id", "cantidad"]}}}, "required": ["items"]}}}
]

def _request(method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    try:
        respuesta = requests.request(method, f"{BASE_URL}{path}", timeout=5, **kwargs)
        respuesta.raise_for_status()
        return respuesta.json()
    except (requests.RequestException, ValueError):
        return {"error": "inventario no disponible"}

def buscar_productos(query: str, tags_requeridos: list[str] | None = None, tags_excluidos: list[str] | None = None, precio_max: int | None = None, categoria: str | None = None, solo_disponibles: bool | None = None, top_k: int = 5) -> dict[str, Any]:
    params: dict[str, Any] = {"q": query, "topK": top_k}
    if tags_requeridos: params["tagsRequeridos"] = ",".join(tags_requeridos)
    if tags_excluidos: params["tagsExcluidos"] = ",".join(tags_excluidos)
    if precio_max is not None: params["precioMax"] = precio_max
    if categoria: params["categoria"] = categoria
    if solo_disponibles is not None: params["soloDisponibles"] = solo_disponibles
    return _request("GET", "/buscar", params=params)

def sustitutos(id: str, top_k: int = 3) -> dict[str, Any]:
    return _request("GET", f"/productos/{id}/sustitutos", params={"topK": top_k})

def validar_carrito(items: list[dict[str, Any]]) -> dict[str, Any]:
    return _request("POST", "/carrito/validar", json={"items": items})

def ejecutar_tool(nombre: str, argumentos: dict[str, Any]) -> dict[str, Any]:
    herramientas = {"buscar_productos": buscar_productos, "sustitutos": sustitutos, "validar_carrito": validar_carrito}
    funcion = herramientas.get(nombre)
    return funcion(**argumentos) if funcion else {"error": "herramienta no disponible"}

if __name__ == "__main__":
    print(buscar_productos("pollo", solo_disponibles=True))
    print(sustitutos("p003"))
    print(validar_carrito([{"id": "p003", "cantidad": 1}]))
