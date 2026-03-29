import { describe, it, expect } from "vitest";
import {
  MOCK_ANALYSIS_STATUS,
  MOCK_ANALYSIS_RESULT,
  MOCK_HISTORY,
} from "@/utils/mock-analysis";

describe("mock data integrity", () => {
  it("MOCK_ANALYSIS_STATUS tem todos os campos obrigatórios", () => {
    expect(MOCK_ANALYSIS_STATUS.id).toBeTruthy();
    expect(MOCK_ANALYSIS_STATUS.status).toBe("processing");
    expect(MOCK_ANALYSIS_STATUS.progress).toBeGreaterThan(0);
    expect(MOCK_ANALYSIS_STATUS.steps.length).toBe(5);
  });

  it("cada step tem id e title", () => {
    for (const step of MOCK_ANALYSIS_STATUS.steps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(["completed", "active", "pending"]).toContain(step.status);
    }
  });

  it("MOCK_ANALYSIS_RESULT tem concorrentes válidos", () => {
    expect(MOCK_ANALYSIS_RESULT.competitors.length).toBe(4);
    for (const comp of MOCK_ANALYSIS_RESULT.competitors) {
      expect(comp.id).toBeTruthy();
      expect(comp.name).toBeTruthy();
      expect(comp.metrics.score).toBeGreaterThan(0);
    }
  });

  it("MOCK_ANALYSIS_RESULT tem recomendações válidas", () => {
    expect(MOCK_ANALYSIS_RESULT.recommendations.length).toBeGreaterThan(0);
    for (const rec of MOCK_ANALYSIS_RESULT.recommendations) {
      expect(rec.text).toBeTruthy();
      expect(["ALTO", "MÉDIO", "BAIXO"]).toContain(rec.impact);
    }
  });

  it("MOCK_HISTORY tem itens válidos", () => {
    expect(MOCK_HISTORY.length).toBeGreaterThan(0);
    for (const item of MOCK_HISTORY) {
      expect(item.id).toBeTruthy();
      expect(item.niche).toBeTruthy();
      expect(["complete", "processing"]).toContain(item.status);
    }
  });
});
