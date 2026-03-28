import { describe, it, expect } from "vitest";
import { detectTipType } from "@/components/home/InlineTip";

describe("detectTipType", () => {
  it("retorna null para texto vazio", () => {
    expect(detectTipType("")).toBeNull();
    expect(detectTipType("   ")).toBeNull();
  });

  it("detecta URL com http", () => {
    expect(detectTipType("https://meusite.com.br")).toBe("url");
  });

  it("detecta URL com www", () => {
    expect(detectTipType("www.minhalojaonline.com.br")).toBe("url");
  });

  it("detecta URL com .com", () => {
    expect(detectTipType("meusite.com")).toBe("url");
  });

  it("retorna 'short' para 1-2 palavras", () => {
    expect(detectTipType("suplementos")).toBe("short");
    expect(detectTipType("loja fitness")).toBe("short");
  });

  it("retorna 'long' para textos com 8+ palavras", () => {
    expect(
      detectTipType("loja de suplementos esportivos em Campinas São Paulo região")
    ).toBe("long");
  });

  it("prioriza URL sobre contagem de palavras", () => {
    expect(
      detectTipType("acesse o site www.minhalojaonline.com.br para ver mais detalhes")
    ).toBe("url");
  });
});
