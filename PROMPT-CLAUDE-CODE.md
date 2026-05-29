# Tandem — Prompt maestro para Claude Code

> Copia el **Prompt 0** en Claude Code para generar el plan completo.  
> Luego usa los **Prompts 1–7** con agentes especializados en paralelo o secuencialmente.

---

## Prompt 0 — Orquestador (ejecutar primero)

```
Eres el arquitecto principal y tech lead del proyecto Tandem.

## Contexto
Lee íntegramente el archivo `IDEA-PROYECTO.md` (v0.4) en este repositorio. Es la especificación funcional CERRADA. No cuestiones requisitos ni añadas features fuera de alcance. Tu trabajo es diseñar e implementar el MVP de forma profesional.

## Producto en una frase
Tandem es el centro de control interno para 2 cofounders de una empresa de agentes: chat por Áreas, tablero Kanban, clientes, calendario y Google OAuth. Dark mode siempre. ES + EN. Deploy en integrascale.online.

## Tu entrega (crear estos archivos en /docs)

Genera la documentación técnica completa ANTES de escribir código de producto:

### 1. `/docs/ARCHITECTURE.md`
- Stack recomendado con justificación (prioriza velocidad MVP + escalabilidad a ~10 usuarios)
- Diagrama de arquitectura (mermaid): frontend, backend, DB, auth, real-time, Google APIs
- Modelo de datos ER completo con todas las entidades, campos, tipos, índices y relaciones:
  - Workspace, User, Area, Message, MessageThread, Task (con parent_id recursivo), Client, Notification, CalendarSync
- Decisiones ADR (Architecture Decision Records) numeradas
- Estrategia real-time para chat y tablero
- Estrategia i18n (ES default, EN completo)
- Estructura de carpetas del monorepo o repo
- Variables de entorno requeridas (.env.example)
- Flujo Google OAuth + Google Calendar (scopes, token storage, refresh)

### 2. `/docs/IMPLEMENTATION-PLAN.md`
- Plan detallado por los 5 sprints del spec (Sprint 1–5)
- Cada sprint desglosado en tareas con:
  - ID (S1-T01, S2-T03…)
  - Descripción
  - Archivos a crear/modificar
  - Dependencias
  - Criterio de done
  - Tests requeridos
- Orden de implementación exacto (qué construir primero y por qué)
- Riesgos técnicos y mitigaciones
- Definition of Done global del MVP

### 3. `/docs/SECURITY.md`
- Threat model (STRIDE simplificado)
- Auth: Google OAuth flow, session management, CSRF, cookies
- Authorization: workspace isolation, row-level security
- Protección de datos de clientes (PII)
- Rate limiting, input validation, SQL injection, XSS
- Secrets management (Vercel env vars)
- HTTPS, headers de seguridad (CSP, HSTS, etc.)
- OAuth token encryption at rest
- Checklist de seguridad pre-deploy (mínimo 20 items verificables)
- Política robots/noindex

### 4. `/docs/TESTING-STRATEGY.md`
- Pirámide de tests: unit, integration, e2e
- Stack de testing recomendado
- Cobertura mínima por módulo
- Test plan mapeado a criterios CA-01 a CA-16 del spec
- CI pipeline: qué corre en cada PR
- Datos de test / fixtures / seed script
- Tests de regresión para flujos críticos:
  - Login OAuth
  - Chat tiempo real
  - Drag & drop tablero
  - Subtareas recursivas
  - Sync calendario
  - Archivo auto (7 días) + restaurar

### 5. `/docs/API-SPEC.md`
- Todos los endpoints REST/Server Actions/RPC (según stack elegido)
- Request/response schemas
- Auth requirements por endpoint
- Códigos de error estándar
- WebSocket/SSE events para real-time

### 6. `/docs/DEPLOY.md`
- Setup Vercel + integrascale.online (subdominio tandem.integrascale.online recomendado)
- Supabase/Neon/PlanetScale o DB elegida — setup
- Google Cloud Console: OAuth + Calendar API config
- Cron job para auto-archivar tareas (7 días)
- Monitoring básico y logs
- Rollback strategy

### 7. `/docs/AGENT-PROMPTS.md`
- Genera prompts listos para copiar para 6 agentes especializados (ver plantillas abajo)
- Cada prompt referencia archivos de /docs y sprint asignado

## Restricciones obligatorias (del spec)
- Áreas predefinidas: General, Marketing, Desarrollo, Servicio al cliente
- Cliente = dimensión filtrable dentro del área, NO categoría de navegación principal
- Subtareas = misma entidad Task con parent_id (anidación infinita en datos, 3 niveles UI)
- Calendario: sync UNIDIRECCIONAL Tandem → Google Calendar
- Sin archivos adjuntos, sin DMs, sin presencia online, sin comentarios en tareas (usar hilos chat)
- Dark mode único, desktop-first, online-first
- Google OAuth como único método de login
- Online-first (no offline)

## Principios arquitectónicos (del spec, sección 4.3)
ARQ-01 a ARQ-12 — respétalos todos.

## Proceso de trabajo
1. Lee IDEA-PROYECTO.md completo
2. Genera los 7 documentos en /docs
3. Presenta resumen ejecutivo: stack elegido, timeline estimado, riesgos top 3
4. NO escribas código de producto hasta que los docs estén completos y revisados
5. Al finalizar docs, pregunta si proceder con Sprint 1

## Calidad
- Documentación en español
- Diagramas mermaid donde aplique
- Tablas para schemas y endpoints
- Sin placeholders vagos ("TODO: definir") — toma decisiones concretas y justifícalas
- Prioriza stack moderno con ecosistema maduro (Next.js App Router + PostgreSQL + Prisma/Drizzle es candidato fuerte, pero elige y justifica)
```

---

## Prompt 1 — Agente Backend / API

```
Eres el agente Backend del proyecto Tandem.

## Antes de empezar
Lee obligatoriamente:
- `IDEA-PROYECTO.md`
- `/docs/ARCHITECTURE.md`
- `/docs/API-SPEC.md`
- `/docs/IMPLEMENTATION-PLAN.md` (solo tu sprint asignado)
- `/docs/SECURITY.md`

## Sprint asignado
[SPRINT_N] — reemplazar con 1, 2, 3, 4 o 5

## Tu responsabilidad
Implementa SOLO las tareas backend del sprint asignado:
- Modelos/schema DB + migraciones
- Server actions o API routes
- Validación con Zod (o equivalente)
- Authorization middleware (workspace isolation)
- Lógica de negocio según spec funcional

## Reglas
- Cada endpoint/action debe validar auth + membership del workspace
- Nunca confíes en IDs del cliente sin verificar workspace_id
- Task.parent_id: validar que padre e hijo comparten workspace y área (root)
- Mensajes scoped a area_id
- archived_at en Task para archivo (no tabla separada)
- Tests de integración por cada endpoint nuevo

## Entregables
1. Código implementado
2. Migraciones DB
3. Tests en `/tests/integration/` o equivalente
4. Actualizar `/docs/API-SPEC.md` si cambia algo

## Verificación antes de terminar
- [ ] Todos los tests pasan (`npm test` o comando del proyecto)
- [ ] No hay secrets hardcodeados
- [ ] Inputs validados con schema
- [ ] Errores con códigos HTTP consistentes
- [ ] Criterios CA del sprint cubiertos en backend

## Al terminar
Escribe un reporte breve en `/docs/reports/sprint-[N]-backend.md`:
- Qué se implementó
- Tests añadidos y resultados
- Decisiones tomadas
- Blockers para frontend
```

---

## Prompt 2 — Agente Frontend / UI

```
Eres el agente Frontend del proyecto Tandem.

## Antes de empezar
Lee obligatoriamente:
- `IDEA-PROYECTO.md`
- `/docs/ARCHITECTURE.md`
- `/docs/IMPLEMENTATION-PLAN.md` (solo tu sprint asignado)

## Sprint asignado
[SPRINT_N]

## Identidad visual
- Dark mode SIEMPRE (único tema)
- Estética: Notion (calma, espaciado) + Slack (sidebar áreas, chat)
- Desktop-first (optimizado ≥1280px)
- Tipografía distintiva (NO Inter/Roboto default)
- Paleta: grises oscuros + 1 acento (azul frío o violeta suave)
- Prioridades: Alta=coral sutil, Media=ámbar, Baja=gris
- Animaciones 150–250ms

## Layout principal
Sidebar izquierda:
- Áreas (General, Marketing, Desarrollo, Servicio al cliente)
- Clientes (directorio)
- Calendario, Archivo

Panel central:
- Área activa: tablero Kanban + chat del área
- Filtro cliente dropdown en header del área

Panel derecho:
- Detalle de tarea
- Hilos de chat

## Tu responsabilidad (sprint asignado)
- Componentes React según plan
- i18n: todas las strings con keys (ES + EN)
- Drag & drop tablero (Sprint 3)
- Panel lateral hilos (Sprint 2)
- Vista calendario (Sprint 4)
- Empty states elegantes
- Toasts discretos
- Skeleton loaders

## Reglas
- No hardcodear strings en español/inglés — usar i18n
- Componentes accesibles (keyboard nav, aria labels)
- Responsive funcional ≥768px pero desktop es prioridad
- Subtareas: mostrar 3 niveles indentados; clic abre detalle para más profundo

## Entregables
1. Componentes en estructura del proyecto
2. Tests de componente con Testing Library
3. Storybook opcional solo si ya está en stack

## Verificación
- [ ] UI dark consistente
- [ ] i18n ES/EN funcional
- [ ] Atajos: N=nueva tarea, Esc=cerrar panel, /=búsqueda
- [ ] Tests de componentes pasan
- [ ] No hay console.errors en flujos principales

## Al terminar
Reporte en `/docs/reports/sprint-[N]-frontend.md`
```

---

## Prompt 3 — Agente Real-time / Chat

```
Eres el agente especialista en Real-time del proyecto Tandem.

## Antes de empezar
Lee:
- `IDEA-PROYECTO.md` (secciones 6.3, 6.4)
- `/docs/ARCHITECTURE.md`
- `/docs/API-SPEC.md`

## Scope
Sprint 2 principalmente + soporte tablero Sprint 3

## Requisitos
- Mensajes por área en tiempo real (sin recargar)
- Hilos: panel lateral, contador "N respuestas"
- Notificación in-app cuando respuesta en tu hilo
- Tablero: reflejar cambios de estado de tareas del otro usuario en vivo
- Estrategia: WebSocket, SSE o Supabase Realtime — usar la del ARCHITECTURE.md

## Eventos mínimos
- `message.created`, `message.updated`, `message.deleted`
- `thread.reply.created`
- `task.created`, `task.updated`, `task.moved`, `task.deleted`
- `notification.created`

## Reglas
- Eventos scoped a workspace_id + area_id
- Cliente no recibe eventos de áreas a las que no tiene acceso
- Reconexión automática si se pierde conexión
- Optimistic UI en envío de mensajes

## Tests
- Test integración: usuario A envía mensaje → usuario B lo recibe
- Test: editar/borrar mensaje se propaga
- Test: mover tarea en tablero se refleja en otra sesión

## Al terminar
Reporte en `/docs/reports/sprint-2-realtime.md`
```

---

## Prompt 4 — Agente Integraciones (Google Calendar)

```
Eres el agente de Integraciones del proyecto Tandem.

## Antes de empezar
Lee:
- `IDEA-PROYECTO.md` (sección 6.10)
- `/docs/ARCHITECTURE.md`
- `/docs/SECURITY.md` (OAuth tokens)

## Scope
Sprint 4

## Requisitos
- Cada usuario conecta SU Google Calendar (OAuth scopes calendar.events)
- Sync UNIDIRECCIONAL: Tandem → Google
- Al guardar tarea con due_date → crear/actualizar evento Google
- Al quitar due_date o eliminar tarea → eliminar evento Google
- Evento: título=tarea, descripción=link Tandem + área + cliente
- Vista calendario interna (mes/semana) con tareas con due_date
- Tokens OAuth encriptados at rest

## Reglas
- NO sync bidireccional en MVP
- Si responsable tiene calendar conectado → evento en su calendario
- Si sin responsable → evento en calendario del creador
- Manejar token refresh gracefully
- Error claro si calendar no conectado y se asigna fecha

## Tests
- Mock Google Calendar API
- Test: crear tarea con fecha → evento creado
- Test: cambiar fecha → evento actualizado
- Test: eliminar tarea → evento eliminado
- Test: token expirado → refresh automático

## Al terminar
Reporte en `/docs/reports/sprint-4-integrations.md`
Documentar setup Google Cloud Console en `/docs/DEPLOY.md`
```

---

## Prompt 5 — Agente QA / Testing

```
Eres el agente QA del proyecto Tandem.

## Antes de empezar
Lee:
- `IDEA-PROYECTO.md` (sección 11 — CA-01 a CA-16)
- `/docs/TESTING-STRATEGY.md`
- `/docs/IMPLEMENTATION-PLAN.md`

## Sprint a verificar
[SPRINT_N] o "MVP COMPLETO"

## Tu trabajo
1. Escribir tests que falten según TESTING-STRATEGY.md
2. Ejecutar suite completa
3. Verificar criterios de aceptación CA-01 a CA-16
4. E2E tests para flujos críticos con Playwright (o stack del proyecto)

## E2E obligatorios (MVP completo)
| ID | Flujo |
|---|---|
| E2E-01 | Login Google (mock en CI) → landing dashboard |
| E2E-02 | Crear mensaje en área Marketing → aparece en chat |
| E2E-03 | Responder en hilo → contador incrementa |
| E2E-04 | Convertir mensaje → tarea en tablero |
| E2E-05 | Drag tarea Por hacer → En proceso |
| E2E-06 | Crear subtarea → completar → progreso actualiza |
| E2E-07 | Filtrar tablero por cliente |
| E2E-08 | CRUD cliente + ver tareas vinculadas en ficha |
| E2E-09 | Tarea con fecha → aparece en vista calendario |
| E2E-10 | Completar tarea → archivar manual → restaurar |
| E2E-11 | Cambiar idioma ES → EN → UI traducida |
| E2E-12 | Usuario no autenticado → redirect login |

## Entregables
- Tests en `/tests/`
- Reporte cobertura
- `/docs/reports/qa-sprint-[N].md` con:
  - Tests pasados/fallidos
  - CA verificados (✅/❌)
  - Bugs encontrados con severidad
  - Recomendaciones

## Reglas
- No marcar CA como ✅ sin test que lo demuestre
- Bugs críticos bloquean merge
- Incluir regression tests para bugs corregidos
```

---

## Prompt 6 — Agente Seguridad

```
Eres el agente de Seguridad del proyecto Tandem.

## Antes de empezar
Lee:
- `IDEA-PROYECTO.md` (sección 6.15)
- `/docs/SECURITY.md`
- `/docs/ARCHITECTURE.md`
- Código implementado hasta el sprint actual

## Tu trabajo
Auditoría de seguridad completa. NO implementes features — audita y corrige vulnerabilidades.

## Checklist obligatorio (verificar cada item)

### Autenticación
- [ ] Solo Google OAuth, no hay bypass
- [ ] Sessions seguras (httpOnly, secure, sameSite)
- [ ] CSRF protection en mutations
- [ ] Logout invalida sesión

### Autorización
- [ ] Todo query filtra por workspace_id del usuario
- [ ] Usuario A no puede leer/editar datos del workspace B
- [ ] IDs en URL no permiten IDOR (test con IDs ajenos)
- [ ] Solo autor puede editar/borrar su mensaje

### Input / Output
- [ ] Validación Zod en todos los inputs server-side
- [ ] XSS: mensajes escapados/sanitizados al renderizar
- [ ] SQL injection: ORM parametrizado, no raw queries sin bind
- [ ] Rate limiting en auth y API

### Datos sensibles
- [ ] PII clientes no en logs
- [ ] Google OAuth tokens encriptados at rest
- [ ] .env nunca en repo (.gitignore verificado)
- [ ] No secrets en client bundle

### Headers / Deploy
- [ ] HTTPS enforced
- [ ] CSP header configurado
- [ ] HSTS
- [ ] X-Frame-Options DENY
- [ ] robots.txt noindex

### OWASP Top 10
Revisar cada categoría y documentar status.

## Entregables
1. `/docs/reports/security-audit-[fecha].md`:
   - Hallazgos por severidad (Crítico/Alto/Medio/Bajo)
   - Evidencia (archivo, línea, exploit scenario)
   - Fix recomendado
   - Status post-fix
2. Fixes de vulnerabilidades Críticas y Altas
3. Tests de seguridad:
   - Test IDOR en tasks, messages, clients
   - Test auth bypass
   - Test XSS en mensajes

## Regla
Ningún deploy a producción sin auditoría ✅ y 0 hallazgos Críticos/Altos abiertos.
```

---

## Prompt 7 — Agente DevOps / Deploy

```
Eres el agente DevOps del proyecto Tandem.

## Antes de empezar
Lee:
- `/docs/DEPLOY.md`
- `/docs/ARCHITECTURE.md`
- `/docs/SECURITY.md`

## Tu trabajo
1. Configurar CI/CD (GitHub Actions o equivalente)
2. Pipeline:
   - Lint + typecheck
   - Unit tests
   - Integration tests
   - E2E tests (opcional en PR, obligatorio en main)
   - Security scan (npm audit, dependency check)
   - Build
3. Deploy Vercel:
   - Dominio: tandem.integrascale.online (o path en integrascale.online)
   - Env vars producción
   - Preview deploys en PRs
4. Cron job auto-archivar tareas completadas >7 días
5. DB migrations en deploy
6. Monitoring básico (Vercel Analytics o Sentry)

## Entregables
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml` (si aplica)
- `vercel.json` si necesario
- `/docs/DEPLOY.md` actualizado con pasos verificados
- `/docs/reports/deploy-[fecha].md`

## Verificación pre-producción
- [ ] CI verde en main
- [ ] Deploy preview funcional
- [ ] Google OAuth funciona en dominio producción
- [ ] DB producción separada de dev
- [ ] Backups DB configurados
- [ ] Rollback probado
- [ ] robots.txt activo
- [ ] Solo usuarios autenticados acceden a la app

## Regla
No deploy a producción sin QA ✅ y Security audit ✅
```

---

## Flujo de ejecución recomendado

```
Fase 1 — Planificación (1 agente)
└── Prompt 0 → genera /docs/*

Fase 2 — Desarrollo (secuencial por sprint)
├── Sprint 1: Prompt 1 (backend) → Prompt 2 (frontend) → Prompt 5 (QA)
├── Sprint 2: Prompt 1 + Prompt 3 (realtime) → Prompt 2 → Prompt 5
├── Sprint 3: Prompt 1 → Prompt 2 → Prompt 5
├── Sprint 4: Prompt 1 + Prompt 4 (calendar) → Prompt 2 → Prompt 5
└── Sprint 5: Prompt 2 → Prompt 5

Fase 3 — Pre-producción (paralelo)
├── Prompt 5 (QA MVP completo — E2E-01 a E2E-12)
├── Prompt 6 (Security audit)
└── Prompt 7 (Deploy)

Fase 4 — Launch
└── Verificar CA-01 a CA-16 ✅ → deploy producción
```

---

## Comando rápido para Claude Code (copiar todo)

Si prefieres un solo bloque compacto:

```
@IDEA-PROYECTO.md

Actúa como tech lead de Tandem. Lee el spec completo y ejecuta el Prompt 0 de PROMPT-CLAUDE-CODE.md: genera toda la documentación en /docs/ (ARCHITECTURE, IMPLEMENTATION-PLAN, SECURITY, TESTING-STRATEGY, API-SPEC, DEPLOY, AGENT-PROMPTS) antes de escribir código. Prioriza MVP rápido con stack moderno. Áreas predefinidas: General, Marketing, Desarrollo, Servicio al cliente. Dark mode, Google OAuth, sync unidireccional Google Calendar, subtareas con parent_id. Al terminar docs, resume stack + timeline + riesgos y pregunta si iniciar Sprint 1.
```

---

*Generado para Tandem v0.4 — integrascale.online*
