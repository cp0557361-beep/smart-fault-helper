# CLAUDE.md

- Los requerimientos y reglas de negocio están en `docs/requerimientos.md`. Léelo antes de cambiar
  lógica de líneas, equipos, plantillas o secuencias, y actualízalo en el mismo commit cuando una regla cambie.
- `.lovable/plan.md` es histórico; si contradice `docs/requerimientos.md`, manda este último.
- Stack: Vite + React + TypeScript + shadcn-ui + Tailwind, backend Supabase (`supabase/`).
- Verificación: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- La interfaz y los mensajes al usuario están en español.
