-- ============================================================================
-- Realtime — habilita Postgres Changes para el tablero (S3-T04).
-- El cliente se suscribe a cambios en `tasks` filtrando por area_id (no-PK),
-- por lo que se requiere REPLICA IDENTITY FULL. RLS sigue filtrando por
-- workspace en la entrega. Portable (igual que 0002): crea la publicación si
-- falta y añade la tabla solo si aún no es miembro.
-- ============================================================================

ALTER TABLE "tasks" REPLICA IDENTITY FULL;--> statement-breakpoint

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
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END
$$;
