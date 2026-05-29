import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  customType,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/*
 * Schema Tandem — 11 tablas (ARCHITECTURE §4).
 * ARQ-01 entidades planas · ARQ-02 Task centro · ARQ-03 subtareas parent_id ·
 * ARQ-07 workspace_id en todas las entidades · ARQ-08 archivo = archived_at.
 */

// ---------- bytea (tokens cifrados, SEC-06) ----------
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

// ---------- enums (ADR-005, valores en español) ----------
export const taskStatus = pgEnum("task_status", [
  "por_hacer",
  "en_proceso",
  "completada",
]);
export const taskPriority = pgEnum("task_priority", ["alta", "media", "baja"]);
export const memberRole = pgEnum("member_role", ["admin", "member", "viewer"]);
export const notificationType = pgEnum("notification_type", [
  "task_assigned",
  "task_status_changed",
  "thread_reply",
  "subtasks_completed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------- workspaces ----------
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id"),
  ...timestamps,
});

// ---------- users (id = auth.users.id de Supabase) ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("es"),
  ...timestamps,
});

// ---------- memberships (M:N user<->workspace) ----------
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("member"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uq_membership_ws_user").on(t.workspaceId, t.userId),
    index("idx_memberships_user").on(t.userId),
  ],
);

// ---------- workspace_invitations ----------
export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

// ---------- areas ----------
export const areas = pgTable(
  "areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    // nombre único por workspace, case-insensitive (AREA-03)
    uniqueIndex("uq_area_ws_name").on(t.workspaceId, sql`lower(${t.name})`),
    index("idx_areas_ws").on(t.workspaceId, t.position),
  ],
);

// ---------- clients ----------
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    phone: text("phone"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("idx_clients_ws").on(t.workspaceId),
    index("idx_clients_active").on(t.workspaceId, t.isActive),
  ],
);

// ---------- tasks (entidad central, self-reference parent_id) ----------
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id").references((): any => tasks.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("por_hacer"),
    priority: taskPriority("priority").notNull().default("media"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    dueDate: timestamp("due_date", { withTimezone: true }),
    position: numeric("position").notNull().default("0"),
    sourceMessageId: uuid("source_message_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_tasks_board").on(t.workspaceId, t.areaId, t.status, t.position),
    index("idx_tasks_parent").on(t.parentId),
    index("idx_tasks_client").on(t.workspaceId, t.clientId),
    index("idx_tasks_assignee").on(t.workspaceId, t.assigneeUserId),
    index("idx_tasks_archive").on(t.workspaceId, t.archivedAt),
    // índice parcial para el cron de auto-archivado (ARC-01)
    index("idx_tasks_autoarchive")
      .on(t.completedAt)
      .where(sql`status = 'completada' AND archived_at IS NULL`),
  ],
);

// ---------- messages (hilo = parent_message_id, ADR-006) ----------
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id, { onDelete: "cascade" }),
    parentMessageId: uuid("parent_message_id").references(
      (): any => messages.id,
      { onDelete: "cascade" },
    ),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("idx_messages_area").on(t.workspaceId, t.areaId, t.createdAt),
    index("idx_messages_thread").on(t.parentMessageId, t.createdAt),
  ],
);

// ---------- notifications ----------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("idx_notif_recipient").on(t.recipientUserId, t.readAt, t.createdAt),
  ],
);

// ---------- calendar_connections (1 por usuario, CAL-05) ----------
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google"),
    googleEmail: text("google_email"),
    accessTokenEnc: bytea("access_token_enc").notNull(),
    refreshTokenEnc: bytea("refresh_token_enc").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    calendarId: text("calendar_id").notNull().default("primary"),
    ...timestamps,
  },
  (t) => [uniqueIndex("uq_calendar_user").on(t.userId)],
);

// ---------- calendar_event_links (Task <-> evento Google) ----------
export const calendarEventLinks = pgTable(
  "calendar_event_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    calendarId: text("calendar_id").notNull().default("primary"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncState: text("sync_state").notNull().default("synced"),
  },
  (t) => [
    uniqueIndex("uq_cel_task").on(t.taskId),
    index("idx_cel_task").on(t.taskId),
  ],
);

// ---------- relations ----------
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  memberships: many(memberships),
  areas: many(areas),
  clients: many(clients),
  tasks: many(tasks),
  messages: many(messages),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [memberships.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

export const areasRelations = relations(areas, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [areas.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
  messages: many(messages),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
  owner: one(users, {
    fields: [clients.ownerUserId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  area: one(areas, { fields: [tasks.areaId], references: [areas.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  assignee: one(users, {
    fields: [tasks.assigneeUserId],
    references: [users.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [messages.workspaceId],
    references: [workspaces.id],
  }),
  area: one(areas, { fields: [messages.areaId], references: [areas.id] }),
  author: one(users, {
    fields: [messages.authorUserId],
    references: [users.id],
  }),
  parent: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
    relationName: "thread",
  }),
  replies: many(messages, { relationName: "thread" }),
}));

// ---------- inferred types ----------
export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type CalendarEventLink = typeof calendarEventLinks.$inferSelect;
