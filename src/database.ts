import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, type Collection } from "mongodb";
import type { Producto } from "./types.js";

function cargarEntornoLocal(): void {
  const ruta = resolve(process.cwd(), ".env");
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const coincidencia = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!coincidencia || process.env[coincidencia[1]]) continue;
    process.env[coincidencia[1]] = coincidencia[2].replace(/^['"]|['"]$/g, "");
  }
}

cargarEntornoLocal();
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Falta MONGODB_URI");
const cliente = new MongoClient(uri);
const base = cliente.db(process.env.MONGODB_DB || "warehouse");

export async function iniciarBaseDatos(): Promise<void> {
  await cliente.connect();
  await productos().createIndex({ id: 1 }, { unique: true });
}

export function productos(): Collection<Producto> { return base.collection<Producto>("products"); }
export async function cerrarBaseDatos(): Promise<void> { await cliente.close(); }
