-- ============================================================================
-- Realtime — habilita Postgres Changes para el chat (S2-T02, MSG-07).
-- El cliente del navegador se suscribe a cambios en `messages` filtrando por
-- area_id / parent_message_id (columnas no-PK), por lo que se requiere
-- REPLICA IDENTITY FULL para que el WAL incluya esos valores. RLS sigue
-- filtrando por workspace en la entrega (solo se reciben filas visibles).
-- Portable: la publicación `supabase_realtime` existe en Supabase; en la BD
-- de test (Postgres plano) se crea vacía si falta, y se añade la tabla solo
-- si aún no es miembro.
-- ============================================================================

ALTER TABLE "messages" REPLICA IDENTITY FULL;--> statement-breakpoint

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
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;
