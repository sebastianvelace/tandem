-- ============================================================================
-- RLS — Row Level Security (ADR-004, SECURITY §4.2)
-- Estrategia: el rol `authenticated` (cliente supabase-js + Realtime) solo
-- puede LEER filas de sus workspaces. No se definen políticas de escritura
-- para `authenticated`, por lo que INSERT/UPDATE/DELETE quedan DENEGADOS por
-- defecto. Todas las mutaciones pasan por Server Actions con la conexión de
-- servicio (que omite RLS) tras validar assertMembership en la capa de app.
-- ============================================================================

-- Shim portable de roles Supabase: existen en Supabase (se omiten); en la BD
-- de test (Postgres plano) se crean para que las políticas TO authenticated
-- sean aplicables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint

-- Shim portable de auth.uid(): en Supabase ya existe (se omite); en la BD de
-- test (Postgres plano) se crea para que las políticas sean evaluables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE 'CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS '
         || '$f$ SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid $f$';
  END IF;
END $$;
--> statement-breakpoint

-- Helper STABLE: workspaces a los que pertenece el usuario actual.
CREATE OR REPLACE FUNCTION public.tandem_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid();
$$;
--> statement-breakpoint

-- Habilitar RLS en todas las tablas.
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_event_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Políticas SELECT para el rol authenticated.
CREATE POLICY "workspaces_select" ON "workspaces" FOR SELECT TO authenticated
  USING (id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

-- Un usuario ve a quienes comparten algún workspace con él (avatares/nombres).
CREATE POLICY "users_select" ON "users" FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT m.user_id FROM public.memberships m
      WHERE m.workspace_id IN (SELECT public.tandem_workspace_ids())
    )
  );--> statement-breakpoint

CREATE POLICY "memberships_select" ON "memberships" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

CREATE POLICY "invitations_select" ON "workspace_invitations" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

CREATE POLICY "areas_select" ON "areas" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

CREATE POLICY "clients_select" ON "clients" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

CREATE POLICY "tasks_select" ON "tasks" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

CREATE POLICY "messages_select" ON "messages" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

-- Notificaciones: solo el destinatario.
CREATE POLICY "notifications_select" ON "notifications" FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());--> statement-breakpoint

-- Conexiones de calendario: solo las propias (tokens, además, cifrados).
CREATE POLICY "calendar_connections_select" ON "calendar_connections" FOR SELECT TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "calendar_event_links_select" ON "calendar_event_links" FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.tandem_workspace_ids()));--> statement-breakpoint

-- Grants para el rol authenticated. RLS restringe POR ENCIMA del grant: sin
-- estos GRANT, las políticas no bastan (denegado a nivel de privilegio).
-- En Supabase los grants por defecto ya cubren esto; aquí son explícitos.
GRANT USAGE ON SCHEMA public TO authenticated, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.tandem_workspace_ids() TO authenticated;--> statement-breakpoint
GRANT SELECT ON
  "workspaces", "users", "memberships", "workspace_invitations", "areas",
  "clients", "tasks", "messages", "notifications", "calendar_connections",
  "calendar_event_links"
TO authenticated;