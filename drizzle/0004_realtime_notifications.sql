-- ============================================================================
-- Realtime — habilita Postgres Changes para notificaciones (S5-T01, NOT-04).
-- El cliente se suscribe a `notifications` filtrando por recipient_user_id
-- (no-PK) → REPLICA IDENTITY FULL. RLS ya restringe a las del destinatario.
-- Portable (igual patrón que 0002/0003).
-- ============================================================================

ALTER TABLE "notifications" REPLICA IDENTITY FULL;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
