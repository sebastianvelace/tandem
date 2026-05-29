/*
 * Errores de dominio mapeados a los códigos de API-SPEC §1.1.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CALENDAR_NOT_CONNECTED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; fields?: Record<string, string> };
    };

/** Envuelve una acción para devolver siempre ActionResult, traduciendo AppError. */
export async function toActionResult<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: { code: err.code, message: err.message, fields: err.fields } };
    }
    // No filtrar detalles internos (SECURITY): log server-side, mensaje genérico.
    console.error("[action:internal]", err);
    return { ok: false, error: { code: "INTERNAL", message: "Error interno" } };
  }
}
