// LYD-96: npm test  (Node >= 23: importa .ts con type stripping nativo)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { campaignLabel, campaignOptions, matchesOrigin, sourceOf } from "../src/lib/attribution.ts";

const tiktok = { source: "TikTok", platform: "whatsapp", campaign: "TT-ING01", capturedAt: "2026-10-20T10:00:00Z" };
const meta = {
  source: "Meta",
  platform: "whatsapp",
  campaign: "120210",
  headline: "Aprende inglés",
  capturedAt: "2026-10-20T10:00:00Z",
};

const conversations = [
  { agentTags: { fuente: "TikTok" }, attribution: tiktok },
  { agentTags: { fuente: "TikTok" }, attribution: tiktok },
  { agentTags: { fuente: "Meta" }, attribution: meta },
  { agentTags: { fuente: "Volanteo" }, attribution: tiktok },
  { agentTags: {} },
];

describe("campaignLabel", () => {
  it("prefiere el titular y cae al codigo o id", () => {
    assert.equal(campaignLabel(meta), "Aprende inglés");
    assert.equal(campaignLabel(tiktok), "TT-ING01");
  });
});

describe("sourceOf", () => {
  it("usa la etiqueta fuente (puede ser manual) y cae a la atribucion", () => {
    assert.equal(sourceOf({ agentTags: { fuente: "Volanteo" }, attribution: tiktok }), "Volanteo");
    assert.equal(sourceOf({ attribution: tiktok }), "TikTok");
    assert.equal(sourceOf({}), undefined);
  });
});

describe("matchesOrigin", () => {
  it("filtra por fuente y por campana", () => {
    assert.equal(conversations.filter((c) => matchesOrigin(c, "todas", "todas")).length, 5);
    assert.equal(conversations.filter((c) => matchesOrigin(c, "TikTok", "todas")).length, 2);
    assert.equal(conversations.filter((c) => matchesOrigin(c, "todas", "TT-ING01")).length, 3);
    assert.equal(conversations.filter((c) => matchesOrigin(c, "TikTok", "TT-ING01")).length, 2);
    assert.equal(conversations.filter((c) => matchesOrigin(c, "Meta", "TT-ING01")).length, 0);
  });
});

describe("campaignOptions", () => {
  it("cuenta por campana, mas usadas primero", () => {
    const options = campaignOptions(conversations);
    assert.deepEqual(
      options.map((o) => [o.campaign, o.total]),
      [
        ["TT-ING01", 3],
        ["120210", 1],
      ],
    );
    assert.equal(options[1].label, "Aprende inglés (120210)");
  });

  it("se acota a la fuente elegida", () => {
    assert.deepEqual(
      campaignOptions(conversations, "Meta").map((o) => o.campaign),
      ["120210"],
    );
  });
});
