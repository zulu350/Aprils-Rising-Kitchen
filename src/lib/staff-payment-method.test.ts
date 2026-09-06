import assert from "node:assert/strict";
import { test } from "node:test";
import {
  looksLikePaymentMethod,
  parseStaffPaymentMethodStored,
  staffPaymentMethodLabel,
} from "./staff-payment-method.ts";

test("labels match admin badge words", () => {
  assert.equal(staffPaymentMethodLabel("venmo"), "Venmo");
  assert.equal(staffPaymentMethodLabel("zelle"), "Zelle");
  assert.equal(staffPaymentMethodLabel("cash"), "Cash");
  assert.equal(staffPaymentMethodLabel("square"), "Square");
  assert.equal(staffPaymentMethodLabel("undecided"), null);
  assert.equal(staffPaymentMethodLabel(""), null);
  assert.equal(staffPaymentMethodLabel(null), null);
});

test("PATCH aliases including Title Case and Card→Square", () => {
  assert.deepEqual(parseStaffPaymentMethodStored("Venmo"), {
    ok: true,
    value: "venmo",
  });
  assert.deepEqual(parseStaffPaymentMethodStored("Zelle"), {
    ok: true,
    value: "zelle",
  });
  assert.deepEqual(parseStaffPaymentMethodStored("Cash"), {
    ok: true,
    value: "cash",
  });
  assert.deepEqual(parseStaffPaymentMethodStored("Square"), {
    ok: true,
    value: "square",
  });
  assert.deepEqual(parseStaffPaymentMethodStored("Card"), {
    ok: true,
    value: "square",
  });
  assert.deepEqual(parseStaffPaymentMethodStored(""), {
    ok: true,
    value: "undecided",
  });
  assert.deepEqual(parseStaffPaymentMethodStored(null), {
    ok: true,
    value: "undecided",
  });
});

test("rejects Other and Paid as methods", () => {
  assert.equal(parseStaffPaymentMethodStored("Other").ok, false);
  assert.equal(parseStaffPaymentMethodStored("Paid").ok, false);
  assert.equal(looksLikePaymentMethod("Venmo"), true);
  assert.equal(looksLikePaymentMethod("Paid"), false);
});
