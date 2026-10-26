# Explorador de redes semánticas

Dashboard interactivo para explorar la red de coocurrencia de entidades del
proyecto [semanticClassification](https://github.com/tprieto23/semanticClassification).
Consume la API de lectura `/analysis/explorer/v1/*`. Toda la metodología
(recurrencia documental, pesos y centralidades) se calcula en el backend; este
repositorio solo filtra, dibuja y compara.

## Qué permite

- **Red**: entidades de las diez categorías enlazadas por coocurrencia en la misma
  oración. El tamaño del nodo corresponde a la métrica elegida y el grosor del link
  a su peso. Al pasar el cursor se ven los vecinos; al hacer clic, el detalle.
- **Filtros para reducir ruido**, aplicados en este orden en el backend:
  1. alcance: período, incubadora, idioma y documentos;
  2. categorías y tipo de link (todos, solo entre categorías, solo dentro de
     cada categoría o pares específicos);
  3. recurrencia documental mínima;
  4. peso mínimo del link;
  5. top N entidades por centralidad.

  El embudo «Qué se está mostrando» indica cuánto quita cada paso.
- **Evolución**: compara los períodos 2021–2023 y 2024–2026 con los mismos filtros.
  Muestra la entidad líder por métrica, las dos redes sobre el mismo mapa de
  posiciones, el cambio de ranking y las entidades que entran o salen del top.
- **Entidades**: una tabla ordenable por cualquier métrica, como alternativa
  accesible al grafo.
- **Evidencia**: al hacer clic en un link se listan las oraciones que lo respaldan,
  con las menciones resaltadas.
- Los filtros viven en la URL, así que una vista se comparte copiando el enlace.

## Requisitos

- Node 24 (ver `.nvmrc`; Vite 8 exige Node ≥ 20.19).
- La API de `semanticClassification` en ejecución (rama con `/analysis/explorer/v1`).

## Puesta en marcha

```bash
nvm use
npm ci
cp .env.example .env        # ajustar VITE_API_BASE_URL si la API no está en :8000
npm run dev
```

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck y build de producción en `dist/` |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run lint` | Lint (oxlint) |
| `npm run typecheck` | Solo TypeScript |
| `npm run gen:api` | Regenera `src/api/schema.d.ts` desde el OpenAPI de la API |

### Contrato con el backend

`src/api/schema.d.ts` se genera desde `GET /openapi.json`; no se edita a mano.
Cuando cambie la API, ejecuta:

```bash
API_URL=http://localhost:8000 npm run gen:api
npm run typecheck
```

Si el backend cambió un campo que se usa aquí, el typecheck falla antes del deploy.

## Arquitectura

```text
src/
├── api/          cliente HTTP tipado, tipos generados y hooks de TanStack Query
├── state/        filtros (Zustand + sincronización con la URL) y selección
├── graph/        construcción del grafo Graphology, escalas y layout ForceAtlas2
├── domain/       vocabulario: colores y etiquetas de categorías, métricas, modos
└── components/   vistas (Red, Evolución, Entidades), filtros y panel de detalle
```

Decisiones principales:

- **Sigma.js 4 + Graphology** para renderizar en WebGL miles de nodos; ECharts
  solo para el gráfico de ranking, cargado bajo demanda.
- **Mapa mental estable**: `LayoutMemory` reutiliza las posiciones entre cambios de
  filtro. En Evolución, ambos períodos se dibujan con las posiciones de la red de
  todo el corpus, así una entidad ocupa el mismo lugar en los dos.
- **Sin métricas en el navegador**: el ranking que se ve es el mismo que reportaría
  un análisis en Python, porque se calcula una sola vez en el backend.
- Las consultas se retrasan 350 ms al mover un control y se cachean por filtro.

## Despliegue en Vercel (producción)

La API corre en AWS detrás de un gateway HTTPS que solo expone el explorador (ver
`deploy/aws/README.md` en `semanticClassification`).

1. *Add New → Project* → importar este repositorio. `vercel.json` ya fija Vite,
   `dist/` y el fallback del SPA.
2. Variable de entorno `VITE_API_BASE_URL` = URL del gateway, por ejemplo
   `https://18-228-10-5.sslip.io`.
3. *Deploy*. Cada push a `main` vuelve a desplegar; cada PR genera una URL de vista previa.

## Alternativa: desplegar en la máquina que tiene los datos

El contenedor sirve el dashboard y hace de proxy **solo** para
`/analysis/explorer/v1/*` (GET/POST) hacia la API. El resto de la API (`/documents`,
`/docs`, `/analysis/network`, DELETE, etc.) no se puede alcanzar por esta URL, así que
se puede compartir sin exponer operaciones destructivas. Aun así, no hay autenticación:
cualquiera con el enlace ve los datos.

1. Levantar la API de `semanticClassification` (expone el puerto 8000):

   ```bash
   docker compose up -d --build
   ```

2. Levantar el dashboard desde este repositorio:

   ```bash
   docker compose up -d --build     # http://localhost:8080
   ```

   Variables opcionales: `WEB_PORT` (por defecto 8080) y `API_UPSTREAM` (por defecto
   `http://host.docker.internal:8000`).

3. Compartir el enlace con otra persona:

   ```bash
   brew install cloudflared
   cloudflared tunnel --url http://localhost:8080
   ```

   Imprime una URL `https://….trycloudflare.com` que cambia cada vez que se reinicia el
   túnel. Para una URL fija: Tailscale Funnel o un túnel con nombre de Cloudflare. La
   máquina debe seguir encendida y sin suspenderse (`caffeinate -d` en macOS).

Para un despliegue separado (por ejemplo en Vercel), construye con
`VITE_API_BASE_URL=https://url-de-la-api` y restringe el CORS de la API a ese dominio.

## Limitaciones conocidas

- Con miles de nodos, el layout ForceAtlas2 corre en el hilo principal; si se vuelve
  lento, conviene moverlo al worker de `graphology-layout-forceatlas2`.
- La cercanía ponderada usa distancia `1/peso`, por eso puede superar 1. Se lee de
  forma relativa entre entidades, no como proporción.
- Los documentos sin año no entran en ningún período; la interfaz indica cuántos son.
