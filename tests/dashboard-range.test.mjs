// LYD-93: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { boundsForDates, boundsForRange } from "../src/lib/dashboard-range.ts";

// Viernes 16 oct 2026, 10:00 de Lima
const NOW = new Date("2026-10-16T15:00:00Z");

describe("boundsForRange", () => {
  it("Hoy arranca a las 00:00 de Lima y queda abierto", () => {
    assert.deepEqual(boundsForRange("Hoy", NOW), { from: "2026-10-16T05:00:00.000Z" });
  });

  it("Ayer es el dia completo anterior", () => {
    assert.deepEqual(boundsForRange("Ayer", NOW), {
      from: "2026-10-15T05:00:00.000Z",
      to: "2026-10-16T04:59:59.999Z",
    });
  });

  it("Semana arranca el lunes", () => {
    assert.equal(boundsForRange("Semana", NOW).from, "2026-10-12T05:00:00.000Z");
  });

  it("Semana en domingo arranca el lunes anterior, no el siguiente", () => {
    assert.equal(boundsForRange("Semana", new Date("2026-10-18T20:00:00Z")).from, "2026-10-12T05:00:00.000Z");
  });

  it("Mes arranca el dia 1", () => {
    assert.equal(boundsForRange("Mes", NOW).from, "2026-10-01T05:00:00.000Z");
  });

  it("usa la hora de Lima: 17 oct 02:00 UTC todavia es 16 en Lima", () => {
    assert.equal(boundsForRange("Hoy", new Date("2026-10-17T02:00:00Z")).from, "2026-10-16T05:00:00.000Z");
  });
});

describe("boundsForDates", () => {
  it("toma ambos dias completos", () => {
    assert.deepEqual(boundsForDates("2026-10-01", "2026-10-05"), {
      from: "2026-10-01T05:00:00.000Z",
      to: "2026-10-06T04:59:59.999Z",
    });
  });

  it("rechaza rangos invertidos o incompletos", () => {
    assert.equal(boundsForDates("2026-10-05", "2026-10-01"), null);
    assert.equal(boundsForDates("", "2026-10-01"), null);
  });
});
