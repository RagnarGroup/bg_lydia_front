// LYD-118: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { alertKey, formatWaiting, isMyAlert, minutesWaiting, replyUrgency } from "../src/lib/reply-deadline.ts";

const NOW = Date.parse("2026-10-27T15:00:00Z");
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();

describe("replyUrgency", () => {
  it("sin espera no hay nivel", () => {
    assert.equal(replyUrgency(null, NOW), null);
    assert.equal(replyUrgency(undefined, NOW), null);
  });

  it("menos de 5 min: nada", () => {
    assert.equal(replyUrgency(minutesAgo(4.9), NOW), null);
  });

  it("de 5 a 10 min: amarillo", () => {
    assert.equal(replyUrgency(minutesAgo(5), NOW), "warning");
    assert.equal(replyUrgency(minutesAgo(9.9), NOW), "warning");
  });

  it("10 min o mas: rojo", () => {
    assert.equal(replyUrgency(minutesAgo(10), NOW), "overdue");
    assert.equal(replyUrgency(minutesAgo(300), NOW), "overdue");
  });

  it("hora invalida no rompe", () => {
    assert.equal(replyUrgency("no-es-fecha", NOW), null);
  });
});

describe("minutesWaiting / formatWaiting", () => {
  it("redondea hacia abajo y nunca es negativo", () => {
    assert.equal(minutesWaiting(minutesAgo(7.8), NOW), 7);
    assert.equal(minutesWaiting(new Date(NOW + 60_000).toISOString(), NOW), 0);
  });

  it("formato corto", () => {
    assert.equal(formatWaiting(7), "7 min");
    assert.equal(formatWaiting(65), "1 h 05 min");
    assert.equal(formatWaiting(180), "3 h");
  });
});

describe("isMyAlert", () => {
  it("sin asignar avisa a todas", () => {
    assert.equal(isMyAlert(undefined, "a1"), true);
  });

  it("asignado: solo a la responsable", () => {
    assert.equal(isMyAlert("a1", "a1"), true);
    assert.equal(isMyAlert("a1", "a2"), false);
    assert.equal(isMyAlert("a1", null), false);
  });
});

describe("alertKey", () => {
  it("cambia con el nivel y con una espera nueva", () => {
    const since = minutesAgo(6);
    assert.notEqual(alertKey("c1", since, "warning"), alertKey("c1", since, "overdue"));
    assert.notEqual(alertKey("c1", since, "warning"), alertKey("c1", minutesAgo(1), "warning"));
  });
});
