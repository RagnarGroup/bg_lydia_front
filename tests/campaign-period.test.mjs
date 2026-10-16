// LYD-91: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  campaignPeriodFor,
  formatLimaDateTime,
  isInPeriod,
  listCampaignPeriods,
  periodDays,
} from "../src/lib/campaign-period.ts";
import { buildCsv } from "../src/lib/leads-export.ts";

describe("campaignPeriodFor", () => {
  it("del 20 en adelante es el periodo que arranca ese mes", () => {
    const p = campaignPeriodFor("2026-10-20T05:00:00Z"); // 20 oct 00:00 Lima
    assert.equal(p.key, "2026-10-20");
    assert.equal(p.label, "20 oct – 19 nov 2026");
  });

  it("del 1 al 19 es el periodo que arranco el mes anterior", () => {
    assert.equal(campaignPeriodFor("2026-10-16T15:00:00Z").key, "2026-09-20");
    assert.equal(campaignPeriodFor("2026-10-19T23:00:00Z").key, "2026-09-20"); // 19 oct 18:00 Lima
  });

  it("usa la hora de Lima, no UTC: 20 oct 02:00 UTC todavia es 19 en Lima", () => {
    assert.equal(campaignPeriodFor("2026-10-20T02:00:00Z").key, "2026-09-20");
  });

  it("cruza el cambio de anio", () => {
    const p = campaignPeriodFor("2027-01-05T12:00:00Z");
    assert.equal(p.key, "2026-12-20");
    assert.equal(p.label, "20 dic 2026 – 19 ene 2027");
  });
});

describe("isInPeriod / periodDays", () => {
  const p = campaignPeriodFor("2026-10-01T12:00:00Z"); // 20 sep – 19 oct

  it("incluye el 20 a las 00:00 y el 19 a las 23:59 de Lima, excluye el 20 siguiente", () => {
    assert.equal(isInPeriod("2026-09-20T05:00:00Z", p), true);
    assert.equal(isInPeriod("2026-09-20T04:59:59Z", p), false);
    assert.equal(isInPeriod("2026-10-20T04:59:59Z", p), true);
    assert.equal(isInPeriod("2026-10-20T05:00:00Z", p), false);
  });

  it("lista los dias del 20 al 19", () => {
    const days = periodDays(p);
    assert.equal(days.length, 30);
    assert.equal(days[0].key, "2026-09-20");
    assert.equal(days.at(-1).key, "2026-10-19");
  });

  it("febrero: 20 ene – 19 feb tiene 31 dias", () => {
    assert.equal(periodDays(campaignPeriodFor("2027-02-01T12:00:00Z")).length, 31);
  });
});

describe("listCampaignPeriods", () => {
  const now = new Date("2026-10-16T15:00:00Z");

  it("arranca en el periodo actual y trae al menos minCount", () => {
    const periods = listCampaignPeriods(now, null, 6);
    assert.equal(periods.length, 6);
    assert.equal(periods[0].key, "2026-09-20");
    assert.equal(periods[5].key, "2026-04-20");
  });

  it("se extiende hasta cubrir el lead mas viejo", () => {
    const periods = listCampaignPeriods(now, "2025-12-25T12:00:00Z", 1);
    assert.equal(periods.at(-1).key, "2025-12-20");
  });
});

describe("formatLimaDateTime", () => {
  it("formatea en hora de Lima", () => {
    assert.equal(formatLimaDateTime("2026-10-16T13:35:00Z"), "16.10.2026 08:35");
  });
});

describe("buildCsv", () => {
  it("BOM, separador ; y escapado de comillas/saltos", () => {
    const csv = buildCsv(
      ["a", "b"],
      [
        ["x;y", 'di "hola"'],
        [null, 3],
      ],
    );
    assert.equal(csv, '\uFEFFa;b\r\n"x;y";"di ""hola"""\r\n;3\r\n');
  });

  it("neutraliza formulas pero no toca telefonos con +", () => {
    const csv = buildCsv(["v"], [["=SUM(A1)"], ["+51 999 888 777"], ["-"]]);
    assert.equal(csv, "\uFEFFv\r\n'=SUM(A1)\r\n+51 999 888 777\r\n'-\r\n");
  });
});
