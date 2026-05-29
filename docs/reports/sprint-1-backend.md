# Reporte — Sprint 1 (Fundación)

> Tech lead. Implementación de la fundación de Tandem según IMPLEMENTATION-PLAN §Sprint 1.

## Qué se implementó

| Tarea | Estado | Entregable |
|---|---|---|
| S1-T01 | ✅ | Scaffold Next.js 15 + React 19 + TS strict + Tailwind v4 + tema dark único + fuentes distintivas + headers de seguridad + robots noindex |
| S1-T02 | ✅ | Clients Supabase (browser/server SSR), Drizzle (lazy connection), `drizzle.config.ts`, `.env.example`, `.gitignore`, `env.ts` validado |
| S1-T03 | ✅ | Schema completo (11 tablas, 4 enums, índices incl. parcial de auto-archivado) + migración `0000` + **RLS** `0001` (SELECT-only para `authenticated`, escrituras denegadas por defecto) |
| S1-T04 | ✅ | i18n next-intl sin routing (idioma por usuario vía cookie), `messages/es.json`+`en.json`, helpers de fecha localizada |
| S1-T05 | ✅ | Login Google OAuth (scopes login+Calendar combinados), callback con bootstrap, `middleware.ts` (gate global) |
| S1-T06 | ✅ | Bootstrap idempotente: upsert user + workspace + 4 áreas default (General/Marketing/Desarrollo/SAC) + membership admin |
| S1-T07 | ✅ | Invitaciones (crear con token, aceptar con validación de expiración), página `/invite/[token]`, settings/workspace con miembros |
| S1-T08 | ✅ | Shell desktop: sidebar (áreas + clientes/calendario/archivo) + header (idioma, avatar, logout), páginas `/areas` |
| S1-T09 | ✅ | Áreas CRUD: crear (nombre único CI), editar, eliminar con destino de tareas (mover a General / borrar) |
| S1-T10 | ✅ | `assertMembership`/`authorize`/`assertAdmin`/`resolveActiveWorkspace` + `AppError`/`ActionResult` (códigos API-SPEC §1.1) |

## Verificación (ejecutada)

- ✅ `pnpm typecheck` — sin errores (TS strict + noUncheckedIndexedAccess).
- ✅ `pnpm build` — 8 rutas + middleware compilan; build de producción OK.
- ✅ `pnpm db:migrate` contra Postgres 16 efímero (Docker) — ambas migraciones aplican.
- ✅ **RLS verificada funcionalmente**: usuario A solo ve datos de su workspace, B del suyo, sin-JWT 0 filas, e INSERT directo del rol `authenticated` **denegado** (sin policy de escritura). Cubre el riesgo R3 (fuga cross-workspace) y empieza a cubrir IDOR.

## Decisiones tomadas

- **RLS SELECT-only + escrituras por Server Actions** (ADR-004): el rol `authenticated` (cliente/Realtime) solo lee; toda mutación pasa por la conexión de servicio tras `assertMembership`. Migración incluye shim portable de roles Supabase y `auth.uid()` para que la BD de test (Postgres plano) funcione.
- **Conexión Drizzle perezosa** (Proxy): no abre socket al importar; el build no requiere `DATABASE_URL`.
- **i18n sin routing por URL**: idioma por usuario en cookie `NEXT_LOCALE` sincronizada con `users.locale` (I18N-03).
- **Fuentes**: objetivo de diseño General Sans/Clash Display (Fontshare, self-host pendiente); por ahora Manrope + Space Grotesk vía `next/font/google` (distintivas, no Inter/Roboto) mapeadas a las mismas variables CSS.

## CA cubiertos

- **CA-01** (login Google 2 usuarios): flujo OAuth + bootstrap + invitación implementados (validación e2e real requiere credenciales Google/Supabase en entorno).
- **CA-15** (parcial): dark mode único + ES/EN funcionando.
- **CA-16** (parcial): gate de autenticación global + robots noindex + headers.

## Blockers / pendientes para siguientes sprints

- **Credenciales de entorno**: para arrancar `pnpm dev` contra datos reales hacen falta proyecto Supabase + Google OAuth configurados (ver DEPLOY §2–3). El código está listo; falta el `.env` real.
- **Tests automatizados**: la verificación de RLS se hizo con script SQL manual; el agente QA (Prompt 5) debe portarla a `tests/integration/` con la infra Vitest + Postgres efímero descrita en TESTING-STRATEGY §8.
- **Fuentes self-host**: sustituir por General Sans/Clash Display cuando se añadan los `.woff2` a `src/app/fonts/`.
- **Modal de área completo** (color/icono) y badge de no leídos (AREA-08/10): quedan para pulido; el CRUD base está.

## Comandos útiles

```bash
pnpm install
pnpm db:migrate        # requiere DIRECT_URL
pnpm dev               # requiere .env (Supabase + Google)
pnpm typecheck && pnpm build
```
