/** Checks the form validation that guards the leads table. */
import { expect, test } from "bun:test";
import { parseLead } from "./lead";

test("parseLead", () => {
  const ok = parseLead({ name: " سارة ", company: "شركة النور", phone: "+966 ٥٠ 123 4567", team_size: "11-15", email: "A@B.co" });
  expect(ok).toMatchObject({ name: "سارة", phone: "+966501234567", team_size: "11-15", email: "a@b.co" });
  expect(parseLead({ name: "x", company: "y", phone: "1" })).toHaveProperty("error");
  expect(parseLead({ name: "سارة", company: "شركة", phone: "0501234567", website: "bot" })).toEqual({ error: "spam" });
  expect(parseLead({ name: "سارة", company: "شركة", phone: "0501234567", team_size: "9999" })).toMatchObject({ team_size: "" });
  expect(parseLead({ name: "سارة", company: "شركة", phone: "0501234567", email: "nope" })).toHaveProperty("error");
});
