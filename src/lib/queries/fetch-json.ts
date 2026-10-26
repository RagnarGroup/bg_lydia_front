import { messageForStatus, NETWORK_ERROR } from "@/lib/lydia-api/errors";

// Para que la UI pueda distinguir "backend caido, 502/503" de otros casos
// hace falta el status como campo propio, no parseando texto. status 0 =
// no hubo respuesta (sin red, servidor caido).
export class LydiaFetchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LydiaFetchError";
    this.status = status;
  }
}

// LYD-110: fetch comun de los hooks de React Query (antes habia una copia por
// archivo). Los route handlers ya devuelven { error } con un mensaje para la
// persona; si la respuesta no es JSON (pagina de error de nginx en un 502/504)
// o directamente no hubo respuesta, el mensaje sale del status -- nunca el
// "Failed to fetch" / "Error 504" crudo del navegador.
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new LydiaFetchError(0, NETWORK_ERROR);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body?.error === "string" && body.error ? body.error : messageForStatus(res.status);
    throw new LydiaFetchError(res.status, message);
  }
  return body as T;
}
