// LYD-91: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inflateRawSync } from "node:zlib";

import { buildXlsx, toExcelSerial } from "../src/lib/leads-export.ts";

// Lee un zip "stored" (lo que genera buildXlsx) -> { nombre: texto }.
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = {};
  let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const method = view.getUint16(pos + 8, true);
    const size = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 30, pos + 30 + nameLen));
    const start = pos + 30 + nameLen + extraLen;
    const raw = bytes.subarray(start, start + size);
    files[name] = new TextDecoder().decode(method === 0 ? raw : inflateRawSync(raw));
    pos = start + size;
  }
  return files;
}

describe("toExcelSerial", () => {
  it("usa la hora de Lima: 2026-10-16 08:35 Lima", () => {
    const serial = toExcelSerial(new Date("2026-10-16T13:35:00Z"));
    // 46311 = 2026-10-16 en Excel; 08:35 = 515/1440 del dia
    assert.ok(Math.abs(serial - (46311 + 515 / 1440)) < 1e-9);
  });
});

describe("buildXlsx", () => {
  const xlsx = buildXlsx(
    "Leads",
    [{ header: "Nombre", width: 20 }, { header: "Teléfono" }, { header: "Monto" }, { header: "Fecha" }],
    [
      ["Ana <Pérez> & Cía", "+51 999 888 777", 1500, new Date("2026-10-16T13:35:00Z")],
      ["=SUM(A1)", null, undefined, null],
    ],
  );
  const files = readZip(xlsx);

  it("trae las partes minimas de un .xlsx", () => {
    for (const part of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      assert.ok(part in files, part);
    }
  });

  it("escapa XML y deja texto como texto (telefono y formulas)", () => {
    const sheet = files["xl/worksheets/sheet1.xml"];
    assert.match(sheet, /Ana &lt;Pérez&gt; &amp; Cía/);
    assert.match(sheet, /t="inlineStr"><is><t xml:space="preserve">\+51 999 888 777</);
    assert.match(sheet, /<t xml:space="preserve">=SUM\(A1\)</);
    assert.doesNotMatch(sheet, /<f>/);
  });

  it("numeros como numero y fechas con el estilo de fecha", () => {
    const sheet = files["xl/worksheets/sheet1.xml"];
    assert.match(sheet, /<c r="C2"><v>1500<\/v><\/c>/);
    assert.match(sheet, /<c r="D2" s="2"><v>46311\.35/);
    assert.match(sheet, /<autoFilter ref="A1:D3"\/>/);
    assert.match(sheet, /state="frozen"/);
  });
});
