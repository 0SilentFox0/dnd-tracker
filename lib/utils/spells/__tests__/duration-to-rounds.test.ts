import { describe, it, expect } from "vitest";
import { parseDurationToRounds } from "../duration-to-rounds";

describe("parseDurationToRounds", () => {
  it("повертає 0 для null та undefined", () => {
    expect(parseDurationToRounds(null)).toBe(0);
    expect(parseDurationToRounds(undefined)).toBe(0);
  });

  it("повертає 0 для порожнього рядка та Instantaneous", () => {
    expect(parseDurationToRounds("")).toBe(0);
    expect(parseDurationToRounds("   ")).toBe(0);
    expect(parseDurationToRounds("Instantaneous")).toBe(0);
    expect(parseDurationToRounds("instantaneous")).toBe(0);
  });

  it("парсить N rounds", () => {
    expect(parseDurationToRounds("1 round")).toBe(1);
    expect(parseDurationToRounds("2 rounds")).toBe(2);
    expect(parseDurationToRounds("4 rounds")).toBe(4);
    expect(parseDurationToRounds("  3 rounds  ")).toBe(3);
  });

  it("парсить N minute(s) як 10*N раундів", () => {
    expect(parseDurationToRounds("1 minute")).toBe(10);
    expect(parseDurationToRounds("2 minutes")).toBe(20);
    expect(parseDurationToRounds("1 minute ")).toBe(10);
  });

  it("парсить N hour(s) як 60*N раундів", () => {
    expect(parseDurationToRounds("1 hour")).toBe(60);
    expect(parseDurationToRounds("2 hours")).toBe(120);
  });

  it("парсить складні рядки з hour або minute", () => {
    expect(parseDurationToRounds("1 hour or triggered")).toBe(60);
    expect(parseDurationToRounds("1 minute or destroyed")).toBe(10);
  });

  it("повертає 0 для невідомого формату", () => {
    expect(parseDurationToRounds("until dispelled")).toBe(0);
    expect(parseDurationToRounds("special")).toBe(0);
  });
});
