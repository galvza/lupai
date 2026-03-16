/**
 * Testes unitários dos hooks useIndicators e useInsights.
 *
 * Cenários cobertos:
 * - T090: Hook carrega dados e expõe indicadores com todos ativos por padrão
 * - T091: Toggle liga/desliga indicadores; filtro por governo filtra corretamente
 * - T092: Insights calculam corretamente maior, menor e variação
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useIndicators } from "@/hooks/useIndicators";
import { useInsights } from "@/hooks/useInsights";
import type { IndicatorKey } from "@/types/indicator";

describe("useIndicators — carregamento (T090)", () => {
  it("deve carregar dados com os 8 indicadores originais ativos por padrão", () => {
    const { result } = renderHook(() => useIndicators());

    const defaultKeys: IndicatorKey[] = [
      "selic",
      "ipca",
      "dolar",
      "salarioMinimo",
      "cestaBasica",
      "gasolina",
      "endividamento",
      "inadimplencia",
    ];
    for (const key of defaultKeys) {
      expect(result.current.activeIndicators.has(key)).toBe(true);
    }

    const newKeys: IndicatorKey[] = [
      "aluguel",
      "energiaEletrica",
      "desemprego",
      "pib",
    ];
    for (const key of newKeys) {
      expect(result.current.activeIndicators.has(key)).toBe(false);
    }
  });

  it("deve aceitar indicadores iniciais customizados", () => {
    const { result } = renderHook(() => useIndicators(["selic", "ipca"]));

    expect(result.current.activeIndicators.size).toBe(2);
    expect(result.current.activeIndicators.has("selic")).toBe(true);
    expect(result.current.activeIndicators.has("ipca")).toBe(true);
    expect(result.current.activeIndicators.has("dolar")).toBe(false);
  });

  it("deve ter governo selecionado null por padrão (todos)", () => {
    const { result } = renderHook(() => useIndicators());
    expect(result.current.selectedGovernment).toBeNull();
  });

  it("deve expor metadata com lastUpdated e period", () => {
    const { result } = renderHook(() => useIndicators());
    expect(result.current.metadata).toHaveProperty("lastUpdated");
    expect(result.current.metadata).toHaveProperty("period");
    expect(result.current.metadata.period).toHaveProperty("start");
    expect(result.current.metadata.period).toHaveProperty("end");
  });

  it("deve expor 7 governos", () => {
    const { result } = renderHook(() => useIndicators());
    expect(result.current.governments).toHaveLength(7);
  });

  it("deve retornar dados pra indicadores ativos", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));
    expect(result.current.data.selic).toBeDefined();
    expect(result.current.data.ipca).toBeUndefined();
  });
});

describe("useIndicators — toggle e filtros (T091)", () => {
  it("deve desativar indicador com toggleIndicator", () => {
    const { result } = renderHook(() => useIndicators());

    act(() => {
      result.current.toggleIndicator("selic");
    });

    expect(result.current.activeIndicators.has("selic")).toBe(false);
    expect(result.current.data.selic).toBeUndefined();
  });

  it("deve reativar indicador com toggle duplo", () => {
    const { result } = renderHook(() => useIndicators());

    act(() => {
      result.current.toggleIndicator("selic");
    });
    expect(result.current.activeIndicators.has("selic")).toBe(false);

    act(() => {
      result.current.toggleIndicator("selic");
    });
    expect(result.current.activeIndicators.has("selic")).toBe(true);
    expect(result.current.data.selic).toBeDefined();
  });

  it("deve filtrar por governo selecionado", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.selectGovernment("bolsonaro");
    });

    expect(result.current.selectedGovernment).toBe("bolsonaro");
    const selicData = result.current.data.selic!;
    for (const point of selicData) {
      expect(point.date >= "2019-01").toBe(true);
      expect(point.date <= "2022-12").toBe(true);
    }
  });

  it("deve limpar filtro de governo com null", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.selectGovernment("bolsonaro");
    });
    const filteredCount = result.current.data.selic!.length;

    act(() => {
      result.current.selectGovernment(null);
    });
    expect(result.current.data.selic!.length).toBeGreaterThanOrEqual(
      filteredCount
    );
  });

  it("deve filtrar por período customizado", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.setDateRange(["2020-01", "2024-12"]);
    });

    expect(result.current.dateRange).toEqual(["2020-01", "2024-12"]);
    const selicData = result.current.data.selic!;
    for (const point of selicData) {
      expect(point.date >= "2020-01").toBe(true);
      expect(point.date <= "2024-12").toBe(true);
    }
  });

  it("deve limpar filtro de período com null", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.setDateRange(["2020-01", "2024-12"]);
    });
    const filteredCount = result.current.data.selic!.length;

    act(() => {
      result.current.setDateRange(null);
    });
    expect(result.current.data.selic!.length).toBeGreaterThanOrEqual(
      filteredCount
    );
  });

  it("deve aplicar governo e período juntos", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.selectGovernment("lula3");
      result.current.setDateRange(["2024-01", "2024-12"]);
    });

    const selicData = result.current.data.selic!;
    for (const point of selicData) {
      expect(point.date >= "2024-01").toBe(true);
      expect(point.date <= "2024-12").toBe(true);
    }
  });

  it("deve retornar lista vazia se governo não tem dados no range", () => {
    const { result } = renderHook(() => useIndicators(["selic"]));

    act(() => {
      result.current.selectGovernment("dilma1");
      result.current.setDateRange(["2000-01", "2002-12"]);
    });

    expect(result.current.data.selic).toEqual([]);
  });
});

describe("useInsights (T092)", () => {
  it("deve gerar insights de extremos pra cada indicador", () => {
    const { result: indResult } = renderHook(() =>
      useIndicators(["selic", "ipca"])
    );
    const { result: insResult } = renderHook(() =>
      useInsights(indResult.current.data)
    );

    const insights = insResult.current;
    expect(insights.length).toBeGreaterThan(0);

    const types = insights.map((i) => i.type);
    expect(types).toContain("max");
    expect(types).toContain("min");
  });

  it("deve gerar insight de variação acumulada", () => {
    const { result: indResult } = renderHook(() =>
      useIndicators(["selic"])
    );
    const { result: insResult } = renderHook(() =>
      useInsights(indResult.current.data)
    );

    const variations = insResult.current.filter((i) => i.type === "variation");
    expect(variations.length).toBeGreaterThan(0);
  });

  it("deve ordenar insights por valor absoluto (mais expressivos primeiro)", () => {
    const { result: indResult } = renderHook(() =>
      useIndicators(["selic", "ipca", "dolar"])
    );
    const { result: insResult } = renderHook(() =>
      useInsights(indResult.current.data)
    );

    const insights = insResult.current;
    for (let i = 1; i < insights.length; i++) {
      expect(Math.abs(insights[i - 1].value)).toBeGreaterThanOrEqual(
        Math.abs(insights[i].value)
      );
    }
  });

  it("deve retornar array vazio se não há dados", () => {
    const { result: insResult } = renderHook(() => useInsights({}));
    expect(insResult.current).toEqual([]);
  });

  it("deve incluir indicator e date em cada insight", () => {
    const { result: indResult } = renderHook(() =>
      useIndicators(["selic"])
    );
    const { result: insResult } = renderHook(() =>
      useInsights(indResult.current.data)
    );

    for (const insight of insResult.current) {
      expect(insight.indicator).toBe("selic");
      expect(insight.date).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof insight.value).toBe("number");
      expect(typeof insight.title).toBe("string");
    }
  });

  it("deve calcular extremos corretamente pra Selic do fixture", () => {
    const { result: indResult } = renderHook(() =>
      useIndicators(["selic"])
    );
    const { result: insResult } = renderHook(() =>
      useInsights(indResult.current.data)
    );

    const maxInsight = insResult.current.find(
      (i) => i.indicator === "selic" && i.type === "max"
    );
    const minInsight = insResult.current.find(
      (i) => i.indicator === "selic" && i.type === "min"
    );

    // Selic fixture: max = 19.75 (2005-08), min = 2 (2021-02)
    expect(maxInsight).toBeDefined();
    expect(maxInsight!.value).toBe(19.75);
    expect(minInsight).toBeDefined();
    expect(minInsight!.value).toBe(2);
  });
});
