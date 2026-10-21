// LYD-100: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { consultaResumen, describeActivity } from "../src/lib/landing/format.ts";

const actividad = (type, meta = null, agent = null) => ({
  id: "a1",
  type,
  content: null,
  meta,
  createdAt: "2026-10-21T10:00:00Z",
  agent,
});

describe("consultaResumen", () => {
  it("junta la opción y el mes de inicio", () => {
    assert.equal(consultaResumen({ opcion: "Lima · 4 weeks", mesInicio: "May 2027", pais: "UK" }), "Lima · 4 weeks · May 2027");
  });

  it("tolera datos faltantes", () => {
    assert.equal(consultaResumen({ mesInicio: "May 2027" }), "May 2027");
    assert.equal(consultaResumen(undefined), "");
    assert.equal(consultaResumen({}), "");
  });
});

describe("describeActivity · consultas (LYD-100)", () => {
  it("el alta de una consulta dice qué se consultó", () => {
    const texto = describeActivity(
      actividad("creado", { tipo: "consulta", detalle: { opcion: "Arequipa · 4 weeks", mesInicio: "March 2027" } }),
    );
    assert.equal(texto, "Consulta recibida desde la landing: Arequipa · 4 weeks · March 2027");
  });

  it("una consulta repetida del mismo correo queda en el historial", () => {
    const texto = describeActivity(actividad("consulta", { tipo: "consulta", detalle: { opcion: "Lima · 4 weeks" } }));
    assert.equal(texto, "Nueva consulta del mismo correo: Lima · 4 weeks");
    assert.equal(describeActivity(actividad("consulta", null)), "Nueva consulta del mismo correo");
  });

  it("el alta de una visita no cambia", () => {
    assert.equal(describeActivity(actividad("creado", { origen: "landing" })), "Lead recibido desde el formulario web");
  });
});
