// LYD-121: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deliveryStatus } from "../src/lib/lydia-api/delivery-status.ts";

describe("deliveryStatus", () => {
  it("sin estados, enviado", () => {
    assert.equal(deliveryStatus(undefined), "sent");
    assert.equal(deliveryStatus([]), "sent");
    assert.equal(deliveryStatus([{ status: "SENT" }, { status: "PENDING" }]), "sent");
  });
  it("gana el de mayor rango sin importar el orden", () => {
    assert.equal(deliveryStatus([{ status: "READ" }, { status: "SENT" }, { status: "DELIVERED" }]), "read");
    assert.equal(deliveryStatus([{ status: "DELIVERED" }, { status: "SENT" }]), "delivered");
  });
  it("acepta los nombres de Baileys y minusculas", () => {
    assert.equal(deliveryStatus([{ status: "DELIVERY_ACK" }]), "delivered");
    assert.equal(deliveryStatus([{ status: "PLAYED" }]), "read");
    assert.equal(deliveryStatus([{ status: "read" }]), "read");
  });
});
