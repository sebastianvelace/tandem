/*
 * DTOs compartidos cliente/servidor para el chat. Fechas como ISO string para
 * que coincidan tanto la respuesta de Server Actions como el payload Realtime
 * (Postgres Changes entrega columnas snake_case en texto).
 */
export type MessageDTO = {
  id: string;
  areaId: string;
  parentMessageId: string | null;
  authorUserId: string;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

/** Mensaje raíz enriquecido con nº de respuestas y si generó una tarea. */
export type RootMessageDTO = MessageDTO & {
  replyCount: number;
  hasTask: boolean;
};

/** Miembro del workspace (para resolver autor/avatar y selectores). */
export type MemberLite = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

/** Cliente activo (selector del modal mensaje→tarea). */
export type ClientLite = {
  id: string;
  name: string;
};
