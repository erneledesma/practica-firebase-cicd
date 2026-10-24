#!/usr/bin/env node
/**
 * Reemplaza los placeholders del Project ID y del secreto en .firebaserc y en
 * los dos workflows.
 *
 * Uso:
 *   node scripts/configurar-proyecto.mjs <PROJECT_ID> [NOMBRE_DEL_SECRETO]
 *
 * Si no pasás el nombre del secreto se usa el que suele crear
 * `firebase init hosting:github`: FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID en
 * mayúsculas con "-" → "_">. Verificalo igual en GitHub → Settings → Secrets.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [projectId, secretArg] = process.argv.slice(2);
if (!projectId) {
  console.error("Uso: node scripts/configurar-proyecto.mjs <PROJECT_ID> [NOMBRE_DEL_SECRETO]");
  process.exit(2);
}
const secret = secretArg ?? `FIREBASE_SERVICE_ACCOUNT_${projectId.toUpperCase().replace(/-/g, "_")}`;

const archivos = [
  ".firebaserc",
  ".github/workflows/firebase-hosting-pull-request.yml",
  ".github/workflows/firebase-hosting-merge.yml",
];
for (const f of archivos) {
  const antes = readFileSync(f, "utf8");
  const despues = antes
    .replaceAll("REEMPLAZAR-POR-TU-PROJECT-ID", projectId)
    .replaceAll("FIREBASE_SERVICE_ACCOUNT_REEMPLAZAR", secret);
  writeFileSync(f, despues);
  console.log(`${antes === despues ? "· sin cambios" : "✔ actualizado"}  ${f}`);
}
console.log(`\nProject ID: ${projectId}\nSecreto:    ${secret}`);
