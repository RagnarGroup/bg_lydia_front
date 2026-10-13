// LYD-68 / LYD-82: el back responde con { message: "..." } dentro del texto del
// error ("Lydia API 400 en /message/sendText/...: {json}") -- se rescata ese
// mensaje para que la UI muestre algo entendible (p. ej. el rechazo de Meta por
// ventana de 24 h) en vez del error crudo.
export function friendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Error desconocido";
  const jsonStart = raw.indexOf("{");
  if (jsonStart === -1) return raw;
  try {
    const body = JSON.parse(raw.slice(jsonStart));
    const message = body?.response?.message ?? body?.message;
    const text = Array.isArray(message) ? message.join(" ") : message;
    if (typeof text === "string" && text) return text;
  } catch {
    // body truncado o no JSON: se devuelve el texto crudo
  }
  return raw;
}
