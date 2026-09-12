import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = () => JSON.parse(readFileSync(resolve(process.cwd(), 'data/products.json'), 'utf8'));
export default function handler(request: any, response: any) {
  const url = new URL(request.url, 'http://localhost');
  if (request.method === 'OPTIONS') return response.status(204).end();
  response.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '');
  if (url.pathname === '/health') return response.status(200).json({ status: 'ok', service: 'warehouse' });
  if (url.pathname === '/productos') { const category = url.searchParams.get('categoria'); return response.status(200).json(catalog().filter((item: any) => !category || item.categoria === category)); }
  if (url.pathname === '/buscar') { const q = (url.searchParams.get('q') || '').toLowerCase(); return response.status(200).json({ resultados: catalog().filter((item: any) => `${item.nombre} ${item.categoria} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q)).map((item: any) => ({ ...item, disponible: item.stock > 0 })), totalEncontrados: 0 }); }
  return response.status(404).json({ error: 'Ruta no encontrada' });
}
