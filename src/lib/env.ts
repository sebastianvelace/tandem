/*
 * Acceso centralizado y validado a variables de entorno.
 * Las server-only NUNCA llevan prefijo NEXT_PUBLIC_ (SECURITY §9).
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "es",

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

  // server-only (lazy: solo validar al usarse en el servidor)
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get databaseUrl() {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  get directUrl() {
    return required("DIRECT_URL", process.env.DIRECT_URL);
  },
  get tokenEncKey() {
    return required("TOKEN_ENC_KEY", process.env.TOKEN_ENC_KEY);
  },
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID);
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET);
  },
} as const;
