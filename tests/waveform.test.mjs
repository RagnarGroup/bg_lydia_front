// LYD-132: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatAudioTime, peaksFromSamples, placeholderPeaks } from "../src/lib/waveform.ts";

describe("peaksFromSamples", () => {
  it("normaliza al pico mayor con un minimo visible", () => {
    const peaks = peaksFromSamples([0, 0.5, 0, -1, 0, 0, 0, 0], 4);
    assert.deepEqual(peaks, [0.5, 1, 0.12, 0.12]);
  });
  it("sin muestras devuelve barras de relleno", () => {
    assert.equal(peaksFromSamples([], 10).length, 10);
  });
});

describe("placeholderPeaks", () => {
  it("es estable por semilla y queda entre 0.25 y 0.75", () => {
    const a = placeholderPeaks("msg-1");
    assert.deepEqual(a, placeholderPeaks("msg-1"));
    assert.ok(a.every((p) => p >= 0.25 && p <= 0.75));
  });
});

describe("formatAudioTime", () => {
  it("minutos y segundos", () => {
    assert.equal(formatAudioTime(0), "0:00");
    assert.equal(formatAudioTime(8.7), "0:08");
    assert.equal(formatAudioTime(125), "2:05");
    assert.equal(formatAudioTime(Infinity), "0:00");
  });
});
