// LYD-110: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { friendlyMessage, GENERIC_ERROR, messageForStatus, NETWORK_ERROR } from "../src/lib/lydia-api/errors.ts";

// Mismo shape que LydiaApiError de client.ts (no se importa: client.ts es server-only).
function apiError(status, path, body) {
  const error = new Error(`Lydia API ${status} en ${path}: ${body.slice(0, 300)}`);
  error.name = "LydiaApiError";
  error.status = status;
  error.body = body;
  return error;
}

describe("friendlyMessage", () => {
  it("nunca devuelve el texto crudo del back aunque el JSON venga truncado", () => {
    const body = JSON.stringify({
      status: 500,
      error: "Internal Server Error",
      response: { message: ["AxiosError: Request failed with status code 400 ".repeat(10)] },
    });
    const message = friendlyMessage(apiError(500, "/message/sendWhatsAppAudio/Brittany Principal", body));
    assert.equal(message, GENERIC_ERROR);
    assert.doesNotMatch(message, /Lydia API|\{|sendWhatsAppAudio/);
  });

  it("reconoce el rechazo de Meta por la ventana de 24 h", () => {
    const body = JSON.stringify({
      status: 400,
      response: { message: [{ error: { code: 131047, message: "Re-engagement message" } }] },
    });
    assert.match(friendlyMessage(apiError(400, "/message/sendText/x", body)), /24 h/);
  });

  it("reconoce audio demasiado pesado y fallas del conversor", () => {
    assert.match(friendlyMessage(apiError(500, "/message/sendWhatsAppAudio/x", '{"message":"LIMIT_FIELD_VALUE: Field value too long"}')), /demasiado grande/);
    assert.match(friendlyMessage(apiError(500, "/message/sendWhatsAppAudio/x", '{"response":{"message":["Failed to convert audio"]}}')), /procesar el audio/);
  });

  it("respeta un 4xx del back con mensaje para la persona", () => {
    const body = JSON.stringify({ status: 409, response: { message: ["Este lead ya lo tomo Ana"] } });
    assert.equal(friendlyMessage(apiError(409, "/crm/landing-leads/1/claim", body)), "Este lead ya lo tomo Ana");
  });

  it("no muestra validaciones tecnicas en ingles", () => {
    const body = JSON.stringify({ status: 400, response: { message: ["title is required"] } });
    assert.equal(friendlyMessage(apiError(400, "/crm/templates", body)), messageForStatus(400));
  });

  it("error de red y falta de configuracion", () => {
    const network = new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
    assert.equal(friendlyMessage(network), NETWORK_ERROR);
    const config = new Error("Falta configurar EVOLUTION_API_URL. Copia .env.example ...");
    config.name = "LydiaApiConfigError";
    assert.doesNotMatch(friendlyMessage(config), /EVOLUTION_API_URL/);
  });

  it("cualquier otra cosa cae al mensaje generico", () => {
    assert.equal(friendlyMessage(new Error("Cannot read properties of undefined (reading 'x')")), GENERIC_ERROR);
    assert.equal(friendlyMessage("algo"), GENERIC_ERROR);
  });
});

describe("messageForStatus", () => {
  it("timeouts y sin respuesta", () => {
    assert.match(messageForStatus(504), /tardó demasiado/);
    assert.equal(messageForStatus(0), NETWORK_ERROR);
  });
});
