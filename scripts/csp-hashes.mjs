#!/usr/bin/env node
/**
 * CSP sin 'unsafe-inline' (desafío extra).
 *
 * Next.js (App Router) incrusta en cada HTML scripts inline del tipo
 *   <script>self.__next_f.push([1,"..."])</script>
 * con el payload RSC que React necesita para hidratar. Con `script-src 'self'`
 * el navegador los bloquea y la página queda sin interactividad.
 *
 * Como el sitio es estático no hay nonce por request, pero los scripts son
 * fijos para un build dado: se puede calcular el sha256 de cada uno DESPUÉS de
 * `next build` y ANTES del deploy, y ponerlos en la CSP.
 *
 * Uso (después de `npm run build`):
 *   node scripts/csp-hashes.mjs            → reescribe firebase.json
 *   node scripts/csp-hashes.mjs --dry-run  → solo muestra la política
 *
 * En el pipeline modifica firebase.json dentro del runner (no se commitea).
 * Ojo: los hashes cambian en cada commit (el SHA del footer viaja dentro del
 * payload RSC), por eso tienen que calcularse en CI, nunca a mano.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";
const CONFIG = "firebase.json";
const dryRun = process.argv.includes("--dry-run");

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return p.endsWith(".html") ? [p] : [];
  });
}

// <script ...>contenido</script> SIN atributo src (solo los inline)
const INLINE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const hashes = new Set();
for (const file of htmlFiles(OUT)) {
  for (const [, body] of readFileSync(file, "utf8").matchAll(INLINE)) {
    if (!body) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
}

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const csp = config.hosting.headers
  .flatMap((r) => r.headers)
  .find((h) => h.key.toLowerCase() === "content-security-policy");
if (!csp) {
  console.error("No hay Content-Security-Policy en firebase.json");
  process.exit(1);
}

const nuevoScriptSrc = ["script-src", "'self'", ...[...hashes].sort()].join(" ");
csp.value = csp.value.replace(/script-src[^;]*/, nuevoScriptSrc);

console.log(`Scripts inline encontrados: ${hashes.size} (hashes únicos)`);
console.log(`Largo de la CSP: ${csp.value.length} caracteres`);
if (csp.value.includes("'unsafe-inline'")) {
  console.error("La CSP todavía contiene 'unsafe-inline'");
  process.exit(1);
}
if (dryRun) console.log(csp.value);
else {
  writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
  console.log("firebase.json actualizado: script-src sin 'unsafe-inline'.");
}
