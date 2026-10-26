// LYD-110: traduce cualquier error a un mensaje para la persona que usa Lydia.
// El detalle tecnico (path del back, JSON, stack, respuesta de Meta) nunca
// llega a la pantalla: queda en los logs del servidor (ver api-error.ts).
// Modulo puro (sin imports de Next ni de client.ts): se usa desde los route
// handlers, desde el cliente (fetch-json.ts) y desde los tests.
//
// Antes (LYD-68 / LYD-82) se rescataba el { message } del back y, si no se
// podia parsear (body truncado, HTML, error de red), se mostraba el texto
// crudo "Lydia API 500 en /message/...: {...".

export const GENERIC_ERROR = "Hubo un problema en el servidor. Intentá de nuevo en unos segundos.";
export const NETWORK_ERROR = "No se pudo conectar con el servidor de Lydia. Revisá tu conexión e intentá de nuevo.";
const CONFIG_ERROR = "Lydia no está bien configurada. Avisá al administrador.";

// Casos conocidos que se reconocen en el texto del error, venga de Meta, del
// fork de Evolution API o del conversor de audio.
const KNOWN_CASES: Array<[RegExp, string]> = [
  [
    /131047|re-?engagement|24 hours|outside (of )?(the )?allowed window|ventana de 24/i,
    "Pasaron más de 24 h desde el último mensaje del contacto: Meta solo permite responder con una plantilla aprobada.",
  ],
  [
    /LIMIT_FIELD_VALUE|LIMIT_FILE_SIZE|too large|file size|payload too large/i,
    "El archivo es demasiado grande para enviarlo por WhatsApp.",
  ],
  [/convert audio|ffmpeg/i, "No se pudo procesar el audio. Probá grabarlo de nuevo."],
  [/131026|not a valid whatsapp|recipient.*not.*whatsapp/i, "El número del contacto no tiene WhatsApp o no puede recibir mensajes."],
  [/rate limit|too many requests|131056|130429/i, "Se enviaron demasiados mensajes seguidos. Esperá unos segundos e intentá de nuevo."],
];

// Lo que delata un mensaje pensado para desarrolladores y no para la asesora.
const TECHNICAL_MARKERS =
  /error|exception|[{}[\]]|https?:|status code|undefined|null|\bat\s|ECONN|ETIMEDOUT|is required|must be|cannot|invalid|not found|lydia api|\/\w+\//i;

export function messageForStatus(status: number): string {
  if (status === 0) return NETWORK_ERROR;
  if (status === 400) return "No se pudo procesar el pedido. Revisá los datos e intentá de nuevo.";
  if (status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
  if (status === 403) return "No tenés permiso para hacer esto.";
  if (status === 404) return "No se encontró lo que buscabas; puede que se haya eliminado.";
  if (status === 409) return "Alguien más modificó esto recién. Recargá e intentá de nuevo.";
  if (status === 413) return "El archivo es demasiado grande para enviarlo por WhatsApp.";
  if (status === 429) return "Demasiados intentos seguidos. Esperá unos segundos e intentá de nuevo.";
  if (status === 408 || status === 504) return "El servidor tardó demasiado en responder. Intentá de nuevo.";
  return GENERIC_ERROR;
}

function statusOf(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return (
    (error.name === "TypeError" && /fetch failed|failed to fetch|networkerror|load failed/i.test(error.message)) ||
    (typeof code === "string" && /^(ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|UND_ERR)/.test(code))
  );
}

// Texto del back: el body completo de LydiaApiError (client.ts) o, si no
// esta, el JSON pegado al final del message. Solo sirve para reconocer
// casos -- se muestra unicamente si pasa looksHuman().
function backendText(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const bodyField = (error as { body?: unknown } | null)?.body;
  const body = typeof bodyField === "string" ? bodyField : raw.slice(Math.max(raw.indexOf("{"), 0));
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.response?.message ?? parsed?.message ?? parsed?.error;
    const parts = (Array.isArray(message) ? message : [message]).map((m) =>
      typeof m === "string" ? m : JSON.stringify(m ?? ""),
    );
    return parts.filter(Boolean).join(" ");
  } catch {
    return body || raw;
  }
}

function looksHuman(text: string): boolean {
  return text.length > 0 && text.length <= 160 && !TECHNICAL_MARKERS.test(text);
}

export function friendlyMessage(error: unknown): string {
  if (error instanceof Error && error.name === "LydiaApiConfigError") return CONFIG_ERROR;
  if (isNetworkError(error)) return NETWORK_ERROR;

  const text = backendText(error);
  const raw = error instanceof Error ? error.message : "";
  for (const [pattern, message] of KNOWN_CASES) {
    if (pattern.test(text) || pattern.test(raw)) return message;
  }

  // Los 4xx del back con un mensaje en castellano para la persona (p. ej. el
  // 409 "ya lo tomo X" de landing-leads o un 403 de permisos) se respetan.
  const status = statusOf(error);
  if (status !== null && status >= 400 && status < 500 && looksHuman(text)) return text;

  return messageForStatus(status ?? 500);
}
