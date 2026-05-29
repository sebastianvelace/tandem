# Tandem — Especificación funcional del producto

> **Versión 0.4** — Requisitos 100% cerrados. Listo para fase de arquitectura (Claude Code).  
> Este documento define *qué* debe hacer el producto, *cómo debe comportarse* y *principios de diseño técnico* sin entrar en stack concreto.

---

## 1. Identidad del proyecto

| Campo | Valor |
|---|---|
| **Nombre** | **Tandem** |
| **Tagline** | *El centro de control de vuestra startup* |
| **Tipo** | Herramienta interna (chat + tareas + clientes + calendario) |
| **Usuarios iniciales** | 2 cofounders |
| **Visión** | Centro de control único para toda la información operativa y tareas de la empresa |
| **Sector** | Empresa de agentes (IA / automatización) |
| **Dominio** | `integrascale.online` — ruta o subdominio dedicado (ver sección 3.3) |
| **Idiomas UI** | Español (principal) + inglés completo (bilingüe) |
| **Plataforma MVP** | Web desktop-first |
| **Tema visual** | **Dark mode siempre** (único tema en MVP) |
| **Referencias UX** | Notion (calma, espaciado) + Slack (canales, chat) |
| **Auth** | Google OAuth |
| **Desarrollo** | MVP lo más rápido posible con Claude Code |

---

## 2. Visión del producto

Tandem es el **único lugar** donde los cofounders gestionan:

- Trabajo organizado por **Áreas** (Marketing, Desarrollo, Servicio al cliente…)
- **Clientes** como dimensión transversal — filtrables dentro de cada área, no como categoría principal de navegación
- **Tareas** con estados, prioridades, subtareas anidadas y fechas opcionales
- **Calendario** integrado (vista interna + sync Google Calendar)
- **Chat** por área con hilos y conversión mensaje → tarea

### Propuesta de valor

> *"Todo lo que la empresa necesita hacer y saber, en un solo lugar, sin ruido."*

### Métrica de éxito interna

- Dejar de usar WhatsApp, Notion u otras herramientas dispersas para tareas y comunicación laboral
- Cualquier acuerdo o tarea tiene trazabilidad: mensaje → tarea → estado → archivo

---

## 3. Modelo de organización (decisión clave)

### 3.1 Problema que planteaste

Querías que **Cliente X no sea una categoría general** sino algo que vive **dentro** de categorías mayores (Marketing, Desarrollo, Servicio al cliente…), con posibilidad de filtrar por cliente dentro de cada área.

### 3.2 Solución adoptada: Áreas + Clientes como dimensión

```
Workspace
├── Área: Marketing          ← navegación principal (chat + tablero)
│   ├── Chat del área
│   ├── Tablero (tareas del área)
│   └── Filtro: [Todos los clientes ▾] [Cliente X] [Cliente Y]
├── Área: Desarrollo
│   ├── Chat + Tablero
│   └── Filtro por cliente
├── Área: Servicio al cliente
│   └── ...
├── Clientes (directorio)    ← fichas CRUD, no reemplaza áreas
├── Calendario
└── Archivo
```

| Concepto | Rol | Analogía |
|---|---|---|
| **Área** | Categoría mayor de trabajo. Agrupa chat + tareas. | Canal de Slack + proyecto de Notion |
| **Cliente** | Etidad con ficha propia. Se **asigna** a tareas. Se **filtra** dentro del área. | Etiqueta con CRM ligero |
| **Tarea** | Pertenece a **1 área** + opcionalmente **1 cliente** + opcionalmente **1 responsable** | Tarjeta Kanban |

**Regla fundamental:** Una tarea siempre tiene **exactamente un Área**. Un cliente puede tener tareas en **varias áreas** (ej. Acme Corp tiene tareas en Marketing y en Desarrollo).

### 3.3 Unificación Canales = Áreas

En v0.2 se hablaba de "canales". En v0.3 **Canales y Áreas son el mismo concepto**, renombrado a **Área** porque refleja mejor vuestro modelo mental.

Evita duplicar: chat por canal + tablero por área + filtro por cliente = **una sola entidad Área** con tres vistas.

### 3.4 Dominio e acceso (`integrascale.online`)

| Opción | Recomendación | Motivo |
|---|---|---|
| `integrascale.online/tandem` | ✅ Válida | Un solo deploy, simple |
| `tandem.integrascale.online` | ✅ **Preferida** | Separación limpia, cookies aisladas, fácil en Vercel |
| "Extensión oculta" tipo `/x7k2` | ⚠️ No recomendada | Seguridad por oscuridad no protege; Google OAuth + login sí |

**Decisión:** Usar subdominio o path dedicado **no indexado** (`robots.txt`, sin link desde web pública). La protección real es **autenticación obligatoria**, no URL secreta.

---

## 4. Crítica de decisiones y resoluciones recomendadas

Análisis honesto de tus respuestas con lo que conviene adoptar para ir rápido sin perder escalabilidad.

### 4.1 ✅ Acertadas sin cambios

| Decisión | Por qué funciona |
|---|---|
| Ficha propia de cliente (P1) | Base para CRM ligero escalable |
| Campos de cliente completos (P2) | Suficiente para operar sin sobrecargar |
| Prioridades Alta/Media/Baja (P11) | Simple, visual, estándar |
| Archivo auto + manual (P16) | Mejor UX: limpieza automática con control |
| Restaurar desde archivo (P17–18) | Esencial, bajo coste |
| Google Calendar por usuario (P19, P21) | Estándar OAuth, sin calendario compartido complejo |
| Google OAuth (P24) | Rápido de implementar, escalable, sin gestionar contraseñas |
| Dark mode always (P27) | Un solo tema = menos CSS, coherente con estética premium |
| Referencias Notion + Slack (P29) | Dirección clara: Notion en calma visual, Slack en chat/áreas |

### 4.2 ⚠️ Ajustadas con recomendación

| Tu respuesta | Crítica | Resolución adoptada |
|---|---|---|
| **Áreas + clientes anidados (P3/P8)** | Idea correcta, pero riesgo de duplicar "canales" y "áreas" como dos sistemas | **Un solo concepto: Área.** Cliente = dimensión filtrable, no nivel de navegación |
| **Anidación infinita subtareas (P10)** | Válida conceptualmente; costosa en UI (indentación, drag & drop, rendimiento) | **Modelo de datos: árbol infinito** (`parent_id`). **UI MVP: mostrar hasta 3 niveles** expandidos; niveles más profundos accesibles navegando dentro de la subtarea |
| **Sync calendario bidireccional (P20)** | Bidireccional = conflictos, webhooks, eventos duplicados, mucho más lento | **MVP: unidireccional Tandem → Google Calendar.** Evento se crea/actualiza/borra al cambiar fecha límite de tarea. Bidireccional en fase 2 si hace falta |
| **Búsqueda global (P31)** | "No sé" — para MVP rápido, búsqueda completa retrasa | **MVP: búsqueda básica** por título en tablero, archivo y directorio de clientes. **Fase 2: búsqueda global** (mensajes + tareas + clientes) |
| **Comentarios en tareas (P32)** | Sistema de comentarios separado duplica el chat | **Sin módulo de comentarios.** Contexto de conversación = hilo de chat vinculado a la tarea. Más rápido y coherente |
| **Offline (P15/P34)** | Sin respuesta | **Online-first.** Requiere conexión. Simplifica MVP enormemente |
| **Pool sin asignar (P7 original)** | Sin confirmar explícitamente | **Mantenido:** tareas pueden existir sin responsable |

### 4.3 Principios de conveniencia arquitectónica (sin stack)

Estos principios guían a Claude Code en la fase de arquitectura:

| # | Principio | Razón |
|---|---|---|
| ARQ-01 | **Entidades planas, relaciones claras** | Área, Cliente, Tarea, Mensaje, Usuario — pocas tablas, muchas FK |
| ARQ-02 | **Tarea es el centro del modelo de datos** | Todo cuelga de Tarea: área, cliente, responsable, subtareas (self-reference), calendario |
| ARQ-03 | **Subtareas = misma entidad Tarea con `parent_id`** | Anidación infinita sin tabla separada; misma lógica CRUD |
| ARQ-04 | **Mensajes pertenecen a un Área** | No a un Cliente directamente; cliente se asocia al convertir a tarea |
| ARQ-05 | **Real-time solo donde importa** | Chat y tablero: sync en vivo. Clientes/calendario: refresh normal |
| ARQ-06 | **Google OAuth + Google Calendar = mismo ecosistema** | Un solo flujo OAuth con scopes combinados |
| ARQ-07 | **Un workspace, multi-usuario desde diseño** | `workspace_id` en todas las entidades aunque MVP tenga uno solo |
| ARQ-08 | **Archivo = flag `archived_at` en Tarea** | No mover datos; filtrar en queries |
| ARQ-09 | **i18n desde día 1 con keys, no strings hardcoded** | ES default, EN completo; preparado para más idiomas |
| ARQ-10 | **Dark theme único** | Variables CSS; no mantener dos temas en MVP |
| ARQ-11 | **Auth middleware en todas las rutas** | Nada público excepto login y assets |
| ARQ-12 | **Calendario externo = side effect al guardar tarea** | No job complejo; trigger on save si `due_date` cambia |

---

## 5. Decisiones confirmadas (registro completo)

| ID | Tema | Decisión final |
|---|---|---|
| D01 | Rol del producto | Centro de control de la empresa |
| D02 | Organización | **Áreas** (Marketing, Dev, SAC…) + **Clientes** como filtro transversal |
| D03 | Canales | **Unificados con Áreas** — un concepto |
| D04 | Clientes | Ficha propia con CRUD |
| D05 | Campos cliente | Nombre, email, empresa, teléfono, notas, activo/inactivo, encargado |
| D06 | Cliente ↔ tareas | Un cliente puede tener múltiples tareas en múltiples áreas |
| D07 | Subtareas | Anidación infinita (datos); UI muestra 3 niveles cómodamente |
| D08 | Prioridades | Alta / Media / Baja (default: Media) |
| D09 | Responsable tarea | Opcional (pool sin asignar permitido) |
| D10 | Fecha límite | Opcional |
| D11 | Archivo | Automático por defecto + manual disponible |
| D12 | Restaurar archivo | Sí |
| D13 | Calendario externo | Google Calendar, unidireccional (Tandem → Google) |
| D14 | Calendario por usuario | Cada cofounder conecta el suyo |
| D15 | Vista calendario interna | Sí |
| D16 | Auth | Google OAuth |
| D17 | Tema | Dark mode siempre |
| D18 | Idioma | ES principal + EN completo; selector por usuario |
| D19 | Chat | Solo texto, editar/borrar, hilos en panel lateral |
| D20 | Comentarios en tareas | No — usar hilo de chat vinculado |
| D21 | Búsqueda MVP | Básica (título); global en fase 2 |
| D22 | Offline | Online-first |
| D23 | Notificaciones | Web in-app |
| D24 | Presencia online | No |
| D25 | DMs / privados | No |
| D26 | Archivos adjuntos | No en MVP |
| D27 | Menciones @ | No |
| D28 | Escalabilidad | Multi-usuario preparado desde diseño |
| D29 | Dominio | integrascale.online (subdominio o path dedicado) |
| D30 | Info sensible | Datos de clientes sí; contratos no |
| D31 | Áreas predefinidas | **General, Marketing, Desarrollo, Servicio al cliente** |

---

## 6. Requisitos funcionales detallados

---

### 6.1 Workspace

| ID | Requisito | Comportamiento |
|---|---|---|
| WS-01 | Un workspace por empresa | Contenedor raíz de áreas, clientes, tareas, usuarios |
| WS-02 | Nombre editable | Admin cambia nombre del workspace |
| WS-03 | Miembros | Lista de usuarios; MVP: 2 cofounders |
| WS-04 | Invitar miembros | Admin envía invitación; usuario entra con Google OAuth |
| WS-05 | Áreas predefinidas al crear | **Confirmado:** General, Marketing, Desarrollo, Servicio al cliente (editables/eliminables) |

---

### 6.2 Usuarios y autenticación

| ID | Requisito | Comportamiento |
|---|---|---|
| AUTH-01 | Login Google OAuth | Botón "Continuar con Google"; crea cuenta si no existe |
| AUTH-02 | Perfil | Nombre (de Google), email, avatar (de Google), idioma preferido |
| AUTH-03 | Idioma | Selector ES / EN en configuración; toda la UI cambia |
| AUTH-04 | Sesión persistente | Permanece logueado en desktop |
| AUTH-05 | Logout | Destruye sesión |
| AUTH-06 | Acceso restringido | Solo miembros del workspace ven datos |
| AUTH-07 | Primer usuario = admin | Quien crea el workspace es admin; invita al cofounder |

---

### 6.3 Áreas (ex-canales)

| ID | Requisito | Comportamiento |
|---|---|---|
| AREA-01 | Listar áreas | Sidebar con todas las áreas del workspace |
| AREA-02 | Crear área | Cualquier miembro puede crear (MVP: ambos cofounders) |
| AREA-03 | Nombre único | Texto corto, único en workspace |
| AREA-04 | Seleccionar área | Clic → carga chat + tablero filtrado de esa área |
| AREA-05 | Área contiene chat | Mensajes scoped al área activa |
| AREA-06 | Área contiene tareas | Tablero muestra solo tareas de esa área |
| AREA-07 | Filtro por cliente | Dropdown dentro del área: "Todos" o cliente específico |
| AREA-08 | Badge actividad | Indicador sutil de mensajes no leídos en el área |
| AREA-09 | Editar/eliminar área | Admin o creador; al eliminar: confirmar destino de tareas (mover a General o eliminar) |
| AREA-10 | Color/icono opcional | Identificador visual minimalista por área (fase pulido) |

**Flujo — Trabajar en Marketing filtrado por cliente:**
1. Clic en área "Marketing" en sidebar
2. Tablero muestra todas las tareas de Marketing
3. Filtro cliente → selecciona "Acme Corp"
4. Tablero muestra solo tareas de Marketing + Acme Corp
5. Chat del área sigue visible (conversación general de Marketing; no filtrado por cliente)

---

### 6.4 Mensajería

| ID | Requisito | Comportamiento |
|---|---|---|
| MSG-01 | Enviar mensaje | Input al pie del área activa; Enter envía, Shift+Enter nueva línea |
| MSG-02 | Solo texto + URLs | Links auto-clicables; sin adjuntos |
| MSG-03 | Timestamp + autor | Hora local + nombre + avatar/iniciales |
| MSG-04 | Orden cronológico | Antiguos arriba, nuevos abajo; scroll infinito hacia arriba |
| MSG-05 | Editar | Autor edita; muestra "(editado)" |
| MSG-06 | Borrar | Autor borra; muestra "[mensaje eliminado]" o desaparece |
| MSG-07 | Tiempo real | Mensajes del otro aparecen sin recargar |
| MSG-08 | Scoped al área | Mensaje pertenece al área donde se escribió |

#### Hilos (threads)

| ID | Requisito | Comportamiento |
|---|---|---|
| TH-01 | Responder en hilo | Acción contextual en mensaje |
| TH-02 | Panel lateral derecho | Desktop: hilo en panel, chat principal sigue visible |
| TH-03 | Contador | "N respuestas" en mensaje padre |
| TH-04 | Notificación | Respuesta en hilo notifica al autor del padre |
| TH-05 | Crear tarea desde mensaje/hilo | Pre-rellena título, descripción, área actual; selector de cliente |

#### Convertir mensaje → tarea

| ID | Requisito | Comportamiento |
|---|---|---|
| MSG-09 | Botón "Crear tarea" | En cada mensaje y respuesta de hilo |
| MSG-10 | Pre-rellenado | Título = primeras ~80 chars; descripción = texto completo |
| MSG-11 | Herencia | Área = área del chat; cliente = seleccionable en modal |
| MSG-12 | Enlace bidireccional | Tarea → "Originado en #Marketing"; mensaje → badge "Tarea creada" con link |

---

### 6.5 Tareas

#### Campos

| Campo | Obligatorio | Default | Notas |
|---|---|---|---|
| Título | ✅ | — | Máx. ~200 chars |
| Descripción | ❌ | vacío | Texto libre |
| Área | ✅ | área activa | No cambiable sin editar (o sí, con confirmación) |
| Cliente | ❌ | null | Selector de clientes existentes |
| Estado | ✅ | `por_hacer` | por_hacer \| en_proceso \| completada |
| Prioridad | ✅ | `media` | alta \| media \| baja |
| Responsable | ❌ | null | Usuario del workspace o sin asignar |
| Fecha límite | ❌ | null | Dispara sync calendario |
| Parent (subtarea) | ❌ | null | ID de tarea padre; null = tarea raíz |
| Creador | auto | usuario actual | — |
| Mensaje origen | ❌ | null | Link si se creó desde chat |
| archived_at | auto | null | Timestamp cuando se archiva |

#### Estados

```
por_hacer ◄────────────────► en_proceso ◄────────────────► completada
   ▲                              ▲                              │
   └──────────────────────────────┴──────────────────────────────┘
                    (cualquier transición permitida)
                              completada → archivada
```

| ID | Requisito | Comportamiento |
|---|---|---|
| TASK-01 | CRUD completo | Crear, leer, editar, eliminar (con confirmación) |
| TASK-02 | 3 estados | Por hacer, En proceso, Completada |
| TASK-03 | Drag & drop | Mover entre columnas en tablero |
| TASK-04 | Orden manual | Reordenar dentro de columna |
| TASK-05 | Orden por prioridad | Toggle: orden manual vs prioridad (alta primero) |
| TASK-06 | Vista detalle | Panel lateral con todos los campos + subtareas + link a chat |
| TASK-07 | Sin comentarios propios | Conversación = hilo de chat vinculado (si existe) |
| TASK-08 | Búsqueda básica | Filtrar por título en tablero y archivo |

#### Subtareas (anidación infinita)

| ID | Requisito | Comportamiento |
|---|---|---|
| SUB-01 | Crear subtarea | Botón "+" en detalle de tarea padre |
| SUB-02 | Misma entidad | Subtarea = Tarea con `parent_id` apuntando al padre |
| SUB-03 | Mismos campos | Subtarea tiene estado, prioridad, responsable, fecha, cliente (hereda área del root) |
| SUB-04 | Anidación infinita | Subtarea puede tener subtareas recursivamente |
| SUB-05 | UI 3 niveles | En detalle: mostrar hasta 3 niveles indentados; clic en subtarea profunda abre su detalle |
| SUB-06 | Progreso | Tarea muestra "X/Y subtareas completadas" (solo hijos directos o total recursivo — **total recursivo**) |
| SUB-07 | Completar subtarea | Checkbox o drag a completada |
| SUB-08 | Sugerencia auto-completar | Si todas las subtareas (directas) completadas → toast "¿Completar tarea padre?" |
| SUB-09 | Área heredada | Subtareas heredan área de la tarea raíz (no se cambia en subtareas) |

---

### 6.6 Tablero Kanban

| ID | Requisito | Comportamiento |
|---|---|---|
| BRD-01 | 3 columnas | Por hacer \| En proceso \| Completada |
| BRD-02 | Scope | Tareas del **área activa** (no globales) |
| BRD-03 | Filtro cliente | Dropdown: Todos los clientes / Cliente X / Sin cliente |
| BRD-04 | Filtro responsable | Todos / Yo / Cofounder / Sin asignar |
| BRD-05 | Filtro prioridad | Multi-select Alta, Media, Baja |
| BRD-06 | Tarjeta | Título, prioridad (color sutil), responsable, cliente (badge), fecha límite, progreso subtareas |
| BRD-07 | Solo tareas raíz | Subtareas NO aparecen como tarjetas; solo en detalle de padre |
| BRD-08 | Completadas recientes | Columna Completada: solo últimas N o últimos X días antes de auto-archivar |
| BRD-09 | Crear rápido | "+" en columna Por hacer |

**Layout desktop:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Tandem                              🔔  [Avatar ▾]               │
├──────────────┬──────────────────────────────────────────────────────┤
│  ÁREAS       │  Marketing          Cliente: [Todos ▾]  Tablero|Lista│
│  ──────────  │  ─────────────────────────────────────────────────── │
│  ○ General   │  POR HACER (2)    EN PROCESO (1)   COMPLETADA (0)   │
│  ● Marketing │  ┌─────────────┐  ┌─────────────┐                   │
│  ○ Desarrollo│  │ Campaña Q2  │  │ Demo Acme   │                   │
│  ○ SAC       │  │ 🔴 Alta     │  │ 🟡 Media    │                   │
│              │  │ Acme Corp   │  │ Acme Corp   │                   │
│  ──────────  │  └─────────────┘  └─────────────┘                   │
│  CLIENTES    │                                                      │
│  Acme Corp   │  ─── CHAT Marketing ──────────────────────────────── │
│  Beta Inc    │  [mensajes del área...]                              │
│              │  [Escribe un mensaje...]                             │
│  ──────────  │                                                      │
│  📅 Calendario│                                                     │
│  📦 Archivo  │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

### 6.7 Vista lista

| ID | Requisito | Comportamiento |
|---|---|---|
| LIST-01 | Alternativa al tablero | Toggle Tablero / Lista en header del área |
| LIST-02 | Columnas | Título, Estado, Prioridad, Responsable, Cliente, Fecha límite |
| LIST-03 | Mismos filtros | Cliente, responsable, prioridad |
| LIST-04 | Ordenar | Clic en header |
| LIST-05 | Acciones inline | Cambiar estado desde dropdown |

---

### 6.8 Archivo

| ID | Requisito | Comportamiento |
|---|---|---|
| ARC-01 | Auto-archivar | Tareas en Completada se archivan automáticamente tras **7 días** (configurable en fase 2) |
| ARC-02 | Archivar manual | Botón "Archivar" en tarea completada (disponible inmediatamente) |
| ARC-03 | Vista Archivo | Navegación global; lista de tareas archivadas |
| ARC-04 | Filtros archivo | Por área, cliente, responsable, título |
| ARC-05 | Restaurar | Botón → vuelve a Completada en tablero activo; `archived_at = null` |
| ARC-06 | Eliminar permanente | Desde archivo, con confirmación |
| ARC-07 | Detalle | Tarea archivada visible en solo lectura con opción editar/restaurar |

---

### 6.9 Clientes (directorio)

| ID | Requisito | Comportamiento |
|---|---|---|
| CLI-01 | CRUD | Crear, ver, editar, eliminar clientes |
| CLI-02 | Campos | Nombre*, email, empresa, teléfono, notas, activo/inactivo, encargado (usuario del workspace) |
| CLI-03 | Nombre obligatorio | Único recomendado, no enforced en MVP |
| CLI-04 | Encargado | Usuario responsable principal del cliente (Cofounder A o B) |
| CLI-05 | Estado | Activo / Inactivo; inactivos ocultos en selectores por default |
| CLI-06 | Ficha cliente | Vista detalle: datos + lista de tareas vinculadas (todas las áreas) + notas |
| CLI-07 | Vincular a tarea | Selector al crear/editar tarea |
| CLI-08 | No es navegación principal | Clientes vive en sidebar secundario; áreas son la navegación de trabajo |
| CLI-09 | Tareas multi-área | Cliente "Acme" puede tener tareas en Marketing y Desarrollo |
| CLI-10 | Sin contratos | No campos de documentos legales |
| CLI-11 | Visible para todos | Todos los miembros ven todos los clientes en MVP |

**Flujo — Cliente nuevo:**
1. Sidebar → Clientes → "+ Nuevo cliente"
2. Rellenar: Acme Corp, contacto@acme.com, encargado = Cofounder B
3. Ir a área Marketing → crear tarea "Campaña Q2" → cliente = Acme Corp
4. Ficha Acme Corp muestra la tarea bajo "Tareas vinculadas"

---

### 6.10 Calendario

| ID | Requisito | Comportamiento |
|---|---|---|
| CAL-01 | Vista interna | Mes / semana con tareas que tienen fecha límite |
| CAL-02 | Scope | Todas las áreas o filtrable por área |
| CAL-03 | Color por prioridad | Alta = acento fuerte, Media = medio, Baja = sutil |
| CAL-04 | Clic en evento | Abre detalle de tarea en panel lateral |
| CAL-05 | Conectar Google | Settings → "Conectar Google Calendar" → OAuth |
| CAL-06 | Sync unidireccional | Al guardar tarea con `due_date` → crear/actualizar evento en Google Calendar del responsable (o creador si sin responsable) |
| CAL-07 | Contenido evento | Título = título tarea; descripción = link a Tandem + área + cliente |
| CAL-08 | Borrar evento | Al quitar fecha o eliminar tarea → eliminar evento Google |
| CAL-09 | Indicador en tarjeta | Icono 📅 si tiene fecha sincronizada |
| CAL-10 | Sin sync inversa en MVP | Eventos creados en Google NO aparecen en Tandem |

**Flujo — Fecha límite:**
1. Tarea "Demo Acme" → fecha viernes 15:00 → responsable B
2. B tiene Google conectado → evento en su Google Calendar
3. Vista Calendario de Tandem → bloque el viernes
4. Cambiar fecha → evento se actualiza

---

### 6.11 Notificaciones web

| ID | Requisito | Comportamiento |
|---|---|---|
| NOT-01 | Campana en header | Badge con count no leídas |
| NOT-02 | Eventos | Tarea asignada a ti; cambio estado en tu tarea; respuesta en tu hilo; subtareas completadas (opcional) |
| NOT-03 | Clic → contexto | Navega a tarea/mensaje/área |
| NOT-04 | Marcar leídas | Individual y "marcar todas" |
| NOT-05 | Solo in-app | Sin email ni push nativo en MVP |

---

### 6.12 Internacionalización

| ID | Requisito | Comportamiento |
|---|---|---|
| I18N-01 | ES + EN | 100% strings traducidos |
| I18N-02 | Default ES | Idioma por defecto español |
| I18N-03 | Selector por usuario | Cada uno elige su idioma |
| I18N-04 | Contenido usuario | No se traduce automáticamente |
| I18N-05 | Fechas localizadas | ES: dd/mm/yyyy — EN: mm/dd/yyyy |

---

### 6.13 Diseño UX/UI

| ID | Requisito | Especificación |
|---|---|---|
| UX-01 | Dark mode único | Fondo oscuro, texto claro, sin toggle claro/oscuro |
| UX-02 | Minimalismo Notion | Mucho espacio, pocos bordes, tipografía protagonista |
| UX-03 | Chat tipo Slack | Áreas en sidebar, mensajes agrupados, hilos laterales |
| UX-04 | Paleta | Grises oscuros + 1 acento (propuesta: azul frío o violeta suave) |
| UX-05 | Prioridades | Alta = rojo coral sutil, Media = ámbar, Baja = gris |
| UX-06 | Panel lateral | Detalle tarea + hilos en panel derecho |
| UX-07 | Animaciones | 150–250ms en drag, apertura panel, toasts |
| UX-08 | Tipografía | Distintiva, no Inter/Roboto default |
| UX-09 | Desktop-first | Layout optimizado ≥1280px; funcional ≥768px |
| UX-10 | Atajos | `N` nueva tarea, `Esc` cerrar panel, `/` búsqueda básica |
| UX-11 | Empty states | Mensajes elegantes cuando no hay tareas/mensajes/clientes |
| UX-12 | Toasts | Discretos, esquina inferior, auto-dismiss |

---

### 6.14 Escalabilidad funcional

| ID | Requisito | Comportamiento |
|---|---|---|
| SCL-01 | N usuarios | Workspace soporta invitaciones |
| SCL-02 | Roles futuros | Admin (gestiona miembros, áreas) / Miembro (usa todo) / Lectura (fase 2) |
| SCL-03 | Multi-workspace | No en MVP; un usuario = un workspace |
| SCL-04 | Auditoría futura | Log de cambios de estado (fase 2) |

---

### 6.15 Seguridad (requisitos funcionales)

| ID | Requisito | Descripción |
|---|---|---|
| SEC-01 | Auth obligatoria | Toda ruta requiere login excepto landing/login |
| SEC-02 | HTTPS | Siempre |
| SEC-03 | Datos clientes | Tratados como sensibles; no endpoints públicos |
| SEC-04 | Exportación | Admin exporta workspace (JSON) |
| SEC-05 | noindex | `robots.txt` bloquea crawlers |
| SEC-06 | OAuth tokens | Calendar tokens encriptados en reposo (detalle en arquitectura) |

---

## 7. Fuera de alcance MVP

| Feature | Fase |
|---|---|
| Archivos adjuntos | 2+ |
| Menciones @ | — |
| Presencia online | — |
| DMs privados | — |
| App móvil nativa | 2+ |
| Push nativo | 2+ |
| Sync calendario bidireccional | 2 |
| Búsqueda global (mensajes) | 2 |
| Comentarios en tareas | — (usar chat) |
| Contratos / docs legales | — |
| Modo claro | — |
| Offline | — |
| Multi-workspace | 3+ |
| Roles granulares | 2 |
| Email notifications | 2 |

---

## 8. Flujos completos

### Flujo A — Día típico
1. Login Google → entra a Tandem
2. Área Marketing → lee chat, responde en hilo sobre Acme
3. "Crear tarea" → "Campaña Q2 Acme", Alta, cliente Acme, fecha viernes
4. Evento en Google Calendar del responsable
5. Cofounder mueve tarea a En Proceso en tablero
6. Añade subtareas anidadas, las completa
7. Completa tarea → auto-archiva a los 7 días

### Flujo B — Filtrar por cliente en área
1. Área Desarrollo → filtro cliente "Beta Inc"
2. Tablero muestra solo tareas Dev + Beta Inc
3. Chat sigue siendo general de Desarrollo

### Flujo C — Cliente con tareas multi-área
1. Ficha "Acme Corp" → ve 3 tareas Marketing + 2 tareas Desarrollo
2. Clic en tarea → abre detalle con link al área

### Flujo D — Restaurar archivo
1. Archivo → busca "Informe Q1"
2. Restaurar → aparece en Completada del área correspondiente

---

## 9. Navegación

```
Tandem
├── [Área] General
├── [Área] Marketing          ← chat + tablero + filtro cliente
├── [Área] Desarrollo
├── [Área] Servicio al cliente
├── [Área] + Crear área
├── Clientes (directorio)
│   └── [Cliente X] → ficha + tareas vinculadas
├── Calendario (vista interna)
├── Archivo
├── Notificaciones 🔔
└── Configuración
    ├── Perfil (idioma)
    ├── Google Calendar (conectar)
    └── Workspace (miembros, exportar)
```

---

## 10. MVP — Sprints

### Sprint 1 — Fundación
- [ ] Google OAuth + sesión
- [ ] Workspace + invitación cofounder
- [ ] Layout dark desktop (sidebar áreas + panel principal)
- [ ] i18n ES/EN base
- [ ] Áreas CRUD + predefinidas

### Sprint 2 — Chat
- [ ] Mensajes por área (CRUD, tiempo real)
- [ ] Hilos (panel lateral)
- [ ] Convertir mensaje → tarea

### Sprint 3 — Tareas + Tablero
- [ ] CRUD tareas (todos los campos)
- [ ] Tablero Kanban con drag & drop
- [ ] Subtareas recursivas (parent_id)
- [ ] Filtros: cliente, responsable, prioridad
- [ ] Vista lista

### Sprint 4 — Clientes + Calendario + Archivo
- [ ] CRUD clientes (todos los campos)
- [ ] Vincular cliente a tarea + ficha con tareas
- [ ] Vista calendario interna
- [ ] Google Calendar sync unidireccional
- [ ] Archivo auto + manual + restaurar

### Sprint 5 — Pulido
- [ ] Notificaciones web
- [ ] Búsqueda básica por título
- [ ] Animaciones, empty states, toasts
- [ ] Deploy integrascale.online
- [ ] Exportación JSON

---

## 11. Criterios de aceptación MVP

| # | Criterio |
|---|---|
| CA-01 | Login Google OAuth funcional para 2 usuarios |
| CA-02 | Áreas con chat independiente y tablero scoped |
| CA-03 | Filtrar tablero por cliente dentro del área |
| CA-04 | Mensajes: enviar, editar, borrar, hilos, tiempo real |
| CA-05 | Crear tarea manual y desde mensaje |
| CA-06 | Tablero: drag & drop entre 3 estados |
| CA-07 | Subtareas anidadas infinitas (mín. 3 niveles en UI) |
| CA-08 | Prioridades, responsable opcional, fecha opcional |
| CA-09 | CRUD clientes con todos los campos |
| CA-10 | Ficha cliente muestra tareas de todas las áreas |
| CA-11 | Vista calendario interna |
| CA-12 | Sync Tandem → Google Calendar |
| CA-13 | Archivo automático (7 días) + manual + restaurar |
| CA-14 | Notificaciones in-app |
| CA-15 | UI dark, minimalista, ES + EN |
| CA-16 | Deploy en integrascale.online accesible solo autenticados |

---

## 12. Glosario

| Término | Definición |
|---|---|
| **Workspace** | Espacio de la empresa |
| **Área** | Categoría mayor (Marketing, Dev…); contiene chat + tareas |
| **Cliente** | Entidad de negocio; se asigna a tareas; se filtra dentro de áreas |
| **Tarea** | Unidad de trabajo; puede ser subtarea de otra |
| **Tarea raíz** | Tarea sin parent; aparece en tablero |
| **Subtarea** | Tarea con parent_id |
| **Hilo** | Respuestas a un mensaje |
| **Archivo** | Tareas completadas fuera del tablero activo |
| **Encargado** | Usuario responsable de un cliente |

---

## 13. Próximo paso

**Fase arquitectura (Claude Code)** — documento separado con:
- Stack recomendado
- Modelo de datos (ER)
- Estructura de carpetas
- Auth flow Google OAuth
- Real-time strategy
- Deploy Vercel + integrascale.online
- Seguridad técnica detallada

**Estado:** Sin preguntas pendientes. Especificación funcional cerrada.

---

*Tandem v0.4 — Especificación funcional cerrada.*
