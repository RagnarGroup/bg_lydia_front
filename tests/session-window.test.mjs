// LYD-95: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isOutsideSessionWindow, sessionWindowHours } from "../src/lib/lydia-api/session-window.ts";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const hoursAgo = (h) => new Date(NOW - h * 3600_000).toISOString();

describe("sessionWindowHours", () => {
  it("TikTok 48 h, el resto 24 h", () => {
    assert.equal(sessionWindowHours("tiktok"), 48);
    assert.equal(sessionWindowHours("whatsapp"), 24);
    assert.equal(sessionWindowHours("instagram"), 24);
  });
});

describe("isOutsideSessionWindow", () => {
  it("TikTok sigue abierto a las 30 h y se cierra pasadas las 48 h", () => {
    assert.equal(isOutsideSessionWindow("tiktok", hoursAgo(30), true, NOW), false);
    assert.equal(isOutsideSessionWindow("tiktok", hoursAgo(49), true, NOW), true);
  });

  it("WhatsApp se cierra a las 24 h", () => {
    assert.equal(isOutsideSessionWindow("whatsapp", hoursAgo(30), true, NOW), true);
  });

  it("sin entrantes o sin mensajes no bloquea", () => {
    assert.equal(isOutsideSessionWindow("tiktok", null, true, NOW), false);
    assert.equal(isOutsideSessionWindow("tiktok", hoursAgo(100), false, NOW), false);
  });
});
