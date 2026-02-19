# Table Master

Sistema de gestión de floor para restaurante con asignación manual de mesas, control de reservas, ocupación walk-in, manejo de áreas y reglas de negocio (solape, VIP, concurrencia, idempotencia) mediante API en Vercel.

## URL pública
- App: `https://<TU-PROYECTO>.vercel.app`
- Swagger UI: `https://<TU-PROYECTO>.vercel.app/docs.html`
- OpenAPI: `https://<TU-PROYECTO>.vercel.app/openapi.yaml`
- Health: `https://<TU-PROYECTO>.vercel.app/api/health`

## Cómo correr local
```bash
npm install
npm run dev
```

Para probar funciones `/api` localmente:
```bash
npx vercel dev
```

## Cómo probar API
- Swagger UI: `public/docs.html` (ruta `/docs.html`)
- OpenAPI contrato: `openapi.yaml`
- Postman: `postman_collection.json`

Ejemplos reales adicionales:
- `data/sample_requests.json`

## Decisiones clave
- API-first con contrato `openapi.yaml`.
- Validación central con `zod`.
- Reglas de dominio separadas (`src/services/domain/*`).
- `Idempotency-Key` obligatorio para `POST /reservations`.
- Concurrencia optimista en posiciones de mesas (`expectedVersion`).

## Limitaciones conocidas
- Persistencia actual del mock backend en `localStorage` (no reemplaza aún una DB multiusuario real).
- No hay auth/roles en endpoints.
- No hay realtime socket aún (polling/refresh actual).

## Estructura del proyecto
- `api/`: Vercel Serverless Functions.
- `src/services/domain/`: reglas y validaciones de dominio.
- `src/services/client-api.ts`: cliente HTTP frontend.
- `openapi.yaml`: contrato API.
- `public/docs.html`: Swagger UI.
- `db/supabase_schema.sql`: esquema SQL para Supabase.
- `tests/`: unit + integration tests.
- `data/`: requests y seed de ejemplo.

## Cómo correr tests
```bash
npm test
```

## Checklist endpoints
- [x] `GET /api/health`
- [x] `GET /api/areas`
- [x] `GET /api/tables`
- [x] `POST /api/tables`
- [x] `PATCH /api/tables/{id}/position`
- [x] `POST /api/tables/{id}/release`
- [x] `GET /api/reservations`
- [x] `POST /api/reservations`
- [x] `PATCH /api/reservations/{id}/status`
- [x] `POST /api/walkins`
- [x] `GET /api/availability`
- [x] `GET /api/floor-layout`

## Supabase paso a paso (cuenta + proyecto)
1. Crea cuenta en https://supabase.com (GitHub recommended).
2. Crea un proyecto nuevo.
3. Ve a SQL Editor y ejecuta `db/supabase_schema.sql`.
4. Ejecuta `db/seed.sql` para cargar datos base consistentes.
5. Copia variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. En Vercel Project Settings > Environment Variables agrega ambas.
7. En local crea `.env.local` con esas variables.

## OpenAPI comandos útiles
```bash
npm run openapi:lint
npm run openapi:types
npm run openapi:postman
```
