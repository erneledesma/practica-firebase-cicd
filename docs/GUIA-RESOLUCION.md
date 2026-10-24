# Guía de resolución paso a paso

Los archivos ya están resueltos en el repo. Esta guía es el orden en que hay que ejecutar todo.
Comandos para **PowerShell** o **Git Bash** en Windows, desde la carpeta del repo.

> Ya incluido: workflows completos (A1–A5 + gate), `firebase.json` con headers, CSP y caché,
> `scripts/csp-hashes.mjs` (CSP sin `'unsafe-inline'` en el pipeline),
> `scripts/configurar-proyecto.mjs` y `REFLEXION.md` (faltan mediciones y links).

---

## 0. Preparación (antes de la clase)

1. Crear el proyecto en https://console.firebase.google.com (plan Spark, sin Analytics). Anotar el **Project ID**.
2. Instalar dependencias y loguearse:
   ```bash
   npm install
   npx firebase login
   ```
3. Conectar GitHub (crea service account + secreto). **Cuando pregunte si sobrescribir workflows: No.**
   Si pregunta por "set up the workflow to run a build script", también podés decir No.
   ```bash
   npx firebase init hosting:github
   ```
   Si igual los pisó: `git checkout -- .github/workflows`.
4. Ver en GitHub → *Settings → Secrets and variables → Actions* el nombre exacto del secreto `FIREBASE_SERVICE_ACCOUNT_...`.
5. Poner Project ID y secreto en `.firebaserc` y en los dos workflows:
   ```bash
   node scripts/configurar-proyecto.mjs TU-PROJECT-ID FIREBASE_SERVICE_ACCOUNT_TU_PROJECT_ID
   ```
6. **B1 (medición inicial):** antes del primer deploy, sacá los headers de `firebase.json` *temporalmente*
   para medir la versión sin hardening, como pide la consigna:
   ```bash
   git stash push firebase.json          # guarda la versión con headers
   npm run build
   npx firebase deploy --only hosting
   node scripts/check-headers.mjs https://TU-PROJECT-ID.web.app > medicion-antes.txt
   git stash pop                         # recupera firebase.json con headers
   ```
   Pegar `medicion-antes.txt` en `REFLEXION.md` (sección B1) y medir en https://securityheaders.com.
   *(Si ya habías desplegado la versión original antes, alcanza con medir esa.)*
7. Probar en local con headers:
   ```bash
   npm run build
   npm run serve                         # http://localhost:5000
   node scripts/check-headers.mjs http://localhost:5000
   ```
8. Prueba de permiso `workflow` del enunciado (sección 4, punto 9). Si falla: `gh auth login` y `gh auth refresh -s workflow`.

## 1. Parte A — Pipeline (min 10–30)

Todo el código va por PR. El primer PR lleva los workflows, la config y los scripts:

```bash
git checkout -b feat/pipeline-y-headers
git add .github firebase.json .firebaserc scripts REFLEXION.md docs/GUIA-RESOLUCION.md
git commit -m "feat: pipeline CI/CD con preview, headers de seguridad, CSP y caché"
git push -u origin feat/pipeline-y-headers
```

Abrir el PR en GitHub y verificar:
- [ ] En *Actions* corre "Preview en Pull Request".
- [ ] El bot comenta la URL del preview (`...--pr1-xxxx.web.app`).
- [ ] El footer del preview muestra el SHA corto del último commit y la rama `feat/pipeline-y-headers`.
- [ ] El paso "Verificar headers en el preview" pasa en verde.
- [ ] En el preview, `/cursos` filtra y la imagen de portada se ve (DevTools → Console sin errores de CSP).

Mergear y verificar en `https://TU-PROJECT-ID.web.app` que el footer muestra el SHA de `main`.

**(Opcional A5)** *Settings → Environments → production → Required reviewers*: agregate como revisora.

### A6 · Ciclo completo y rollback
```bash
git checkout main && git pull
git checkout -b feat/titulo
# editar el <h1> de app/page.tsx, por ejemplo: "Catálogo de Cursos · Melina"
git commit -am "feat: nuevo título de la home"
git push -u origin feat/titulo
```
1. Abrir PR → ver el título nuevo en el preview y que producción **no** cambió.
2. Mergear → producción muestra el título y el SHA nuevos.
3. Consola Firebase → *Hosting → Release history → ⋮ → Rollback* sobre la versión anterior → el footer vuelve al SHA anterior (recargar con Ctrl+F5 o ventana privada).
4. **Bonus:** promover un preview sin recompilar:
   ```bash
   npx firebase hosting:channel:list
   npx firebase hosting:clone TU-PROJECT-ID:pr2-feat-titulo-XXXX TU-PROJECT-ID:live
   ```
   (usar el ID de canal que muestra el `list`).

Captura sugerida para la entrega: el comentario del bot en el PR, y el Release history después del rollback.

## 2. Parte B — Headers (min 30–55)

Ya está todo en `firebase.json`. Lo que hay que **mostrar y entender** (lo pide la reflexión):

1. Probar la CSP “estricta” del enunciado para ver la rotura: cambiar en `firebase.json`
   `script-src 'self' 'unsafe-inline'` → `script-src 'self'` y `img-src ...` → `img-src 'self'`.
   `npm run build && npm run serve`, abrir `http://localhost:5000/cursos` con DevTools:
   - Console: `Refused to execute inline script because it violates ... script-src 'self'` → el filtro no responde.
   - Abrir `out/cursos.html`: muchos `<script>self.__next_f.push(...)</script>` inline (payload RSC para hidratar).
   - En `/`, Network: `picsum.photos` → redirect 302 → `fastly.picsum.photos` (la imagen se bloquea).
   - Volver a dejar los valores del repo (`git checkout firebase.json`).
2. Ver la versión con hashes en local:
   ```bash
   npm run build
   node scripts/csp-hashes.mjs           # reescribe firebase.json con los sha256
   npm run serve                         # /cursos tiene que funcionar sin 'unsafe-inline'
   git checkout firebase.json            # NO commitear la versión con hashes
   ```
3. **B5:** después del merge, medir producción:
   ```bash
   node scripts/check-headers.mjs https://TU-PROJECT-ID.web.app > medicion-despues.txt
   ```
   Tiene que terminar en `✅ Todos los controles pasaron.` Pegar en `REFLEXION.md` y re-medir en securityheaders.com.

> ⚠️ Revisar en Network que la imagen realmente redirige a `fastly.picsum.photos`. Si aparece otro host, agregalo exacto en `img-src`.
> Si la consola muestra un error de **style-src** (algún `<style>` inline), calcular su hash igual que los scripts o, en el peor caso, justificar `'unsafe-inline'` solo en `style-src` (riesgo mucho menor que en scripts).

## 3. Entrega
- [ ] Completar en `REFLEXION.md`: Project ID, número de PR, calificaciones y las dos salidas de `check-headers`.
- [ ] Commitear `REFLEXION.md` por un PR final (`docs/reflexion`) y mergear.
- [ ] Entregar: link al repo, `https://TU-PROJECT-ID.web.app`, link al PR mergeado con el comentario del bot.

## Problemas posibles
| Síntoma | Solución |
|---|---|
| `Input required and not supplied: firebaseServiceAccount` | El nombre del secreto en los YAML no coincide: volver a correr `configurar-proyecto.mjs` con el nombre exacto. |
| El paso "CSP con hashes" falla con "todavía contiene 'unsafe-inline'" | Algún otro header tiene `'unsafe-inline'`; revisar `firebase.json`. |
| El gate de headers falla en el preview | Ver qué header marca en rojo el log del paso. |
| El environment pide aprobación y el deploy no arranca | Ir a la ejecución en Actions → *Review deployments* → Approve. |
| Git ve todos los archivos como modificados | Es solo CRLF/LF de Windows. `git config core.autocrlf true` y `git status` de nuevo. |
