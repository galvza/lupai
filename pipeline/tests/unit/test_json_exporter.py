"""Testes unitários do exportador JSON (loaders/json_exporter.py).

Cenários cobertos:
- T050: Exportar indicators.json com dados válidos — deve gerar JSON válido conforme schema
- T051: Exportar metadata.json com informações de fontes — deve conter lastUpdated e sources
- T052: Exportar com diretório inexistente — deve criar diretório automaticamente
- T053: JSON gerado deve ser menor que 1MB — validar tamanho do arquivo
- T054: Conteúdo do JSON deve corresponder ao schema definido em ARCHITECTURE.md
"""

import json
import os
from pathlib import Path

import pytest

from src.loaders.json_exporter import (
    GOVERNMENT_PERIODS,
    INDICATOR_META,
    export_governments,
    export_indicators,
    export_metadata,
)
from src.models.indicators import MonthlyDataPoint, SourceStatus


def _p(date: str, value: float) -> MonthlyDataPoint:
    """Helper: cria MonthlyDataPoint."""
    return MonthlyDataPoint(date=date, value=value)


def _sample_indicators() -> dict[str, list[MonthlyDataPoint]]:
    """Retorna dict com indicadores de exemplo pra testes."""
    return {
        "selic": [_p("2024-01", 11.75), _p("2024-02", 11.25)],
        "ipca": [_p("2024-01", 4.51), _p("2024-02", 4.49)],
        "dolar": [_p("2024-01", 4.92), _p("2024-02", 4.97)],
        "salario_minimo": [_p("2024-01", 1412.0)],
        "cesta_basica": [_p("2024-01", 708.53), _p("2024-02", 715.20)],
        "gasolina": [_p("2024-01", 5.87), _p("2024-02", 5.92)],
        "endividamento": [_p("2024-01", 48.2), _p("2024-02", 48.5)],
        "inadimplencia": [_p("2024-01", 3.5), _p("2024-02", 3.4)],
    }


def _sample_sources() -> list[SourceStatus]:
    """Retorna lista de status de fontes pra testes."""
    return [
        SourceStatus(
            id="bcb",
            name="Banco Central do Brasil",
            url="https://api.bcb.gov.br",
            last_fetch="2024-03-01T10:00:00Z",
            status="success",
        ),
        SourceStatus(
            id="dieese",
            name="DIEESE",
            url="https://www.dieese.org.br",
            last_fetch="2024-03-01T10:01:00Z",
            status="success",
        ),
        SourceStatus(
            id="anp",
            name="ANP",
            url="https://www.gov.br/anp",
            last_fetch="2024-03-01T10:02:00Z",
            status="error",
        ),
    ]


class TestJSONExporterIndicators:
    """T050: Exportar indicators.json com dados válidos."""

    def test_generates_valid_json(self, tmp_output_dir):
        """Deve gerar arquivo JSON válido (parseável)."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, dict)

    def test_follows_indicators_schema(self, tmp_output_dir):
        """JSON deve ter lastUpdated, period e indicators."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert "lastUpdated" in data
        assert "period" in data
        assert "start" in data["period"]
        assert "end" in data["period"]
        assert "indicators" in data

    def test_all_indicators_present(self, tmp_output_dir):
        """Deve conter todas as 8 séries de indicadores."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        ind = data["indicators"]
        # salario_minimo → salarioMinimo, cesta_basica → cestaBasica
        expected_keys = {
            "selic", "ipca", "dolar", "salarioMinimo",
            "cestaBasica", "gasolina", "endividamento", "inadimplencia",
        }
        assert set(ind.keys()) == expected_keys

    def test_data_points_have_date_and_value(self, tmp_output_dir):
        """Cada ponto deve ter campos date e value."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        for key, points in data["indicators"].items():
            for point in points:
                assert "date" in point, f"Faltando 'date' em {key}"
                assert "value" in point, f"Faltando 'value' em {key}"

    def test_period_reflects_data_range(self, tmp_output_dir):
        """period.start e period.end devem refletir o range dos dados."""
        indicators = {
            "selic": [_p("2010-06", 10.0), _p("2023-12", 11.0)],
        }
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert data["period"]["start"] == "2010-06"
        assert data["period"]["end"] == "2023-12"

    def test_empty_indicators(self, tmp_output_dir):
        """Dict vazio de indicadores deve gerar JSON com defaults."""
        filepath = export_indicators({}, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert data["indicators"] == {}
        assert data["period"]["start"] == "2005-01"
        assert data["period"]["end"] == "2025-12"

    def test_snake_case_to_camel_case(self, tmp_output_dir):
        """Chaves snake_case devem ser convertidas pra camelCase."""
        indicators = {
            "salario_minimo": [_p("2024-01", 1412.0)],
            "cesta_basica": [_p("2024-01", 708.53)],
        }
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert "salarioMinimo" in data["indicators"]
        assert "cestaBasica" in data["indicators"]
        assert "salario_minimo" not in data["indicators"]
        assert "cesta_basica" not in data["indicators"]


class TestJSONExporterGovernments:
    """Exportar governments.json com os 7 períodos de governo."""

    def test_generates_valid_json(self, tmp_output_dir):
        """Deve gerar arquivo JSON válido."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, dict)
        assert "governments" in data

    def test_has_seven_periods(self, tmp_output_dir):
        """Deve conter exatamente 7 períodos de governo."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert len(data["governments"]) == 7

    def test_government_fields(self, tmp_output_dir):
        """Cada governo deve ter id, name, president, start, end, color."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        required_fields = {"id", "name", "president", "start", "end", "color"}
        for gov in data["governments"]:
            assert required_fields.issubset(set(gov.keys())), (
                f"Governo {gov.get('id')} faltando campos"
            )

    def test_government_ids(self, tmp_output_dir):
        """IDs dos governos devem estar corretos."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        ids = [g["id"] for g in data["governments"]]
        expected = [
            "lula1", "lula2", "dilma1", "dilma2",
            "temer", "bolsonaro", "lula3",
        ]
        assert ids == expected

    def test_government_dates_are_valid(self, tmp_output_dir):
        """Datas de início e fim devem estar em formato YYYY-MM."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        import re
        date_pattern = re.compile(r"^\d{4}-\d{2}$")
        for gov in data["governments"]:
            assert date_pattern.match(gov["start"]), (
                f"Data inválida start={gov['start']} em {gov['id']}"
            )
            assert date_pattern.match(gov["end"]), (
                f"Data inválida end={gov['end']} em {gov['id']}"
            )

    def test_governments_are_chronological(self, tmp_output_dir):
        """Governos devem estar em ordem cronológica."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        starts = [g["start"] for g in data["governments"]]
        assert starts == sorted(starts)


class TestJSONExporterMetadata:
    """T051: Exportar metadata.json."""

    def test_contains_last_updated(self, tmp_output_dir):
        """Deve conter campo lastUpdated em ISO 8601."""
        indicators = _sample_indicators()
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert "lastUpdated" in data
        assert "T" in data["lastUpdated"]
        assert data["lastUpdated"].endswith("Z")

    def test_contains_sources(self, tmp_output_dir):
        """Deve conter lista de fontes com id, name, url, status."""
        indicators = _sample_indicators()
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert "sources" in data
        assert len(data["sources"]) == 3
        for src in data["sources"]:
            assert "id" in src
            assert "name" in src
            assert "url" in src
            assert "status" in src
            assert "lastFetch" in src

    def test_contains_indicators_meta(self, tmp_output_dir):
        """Deve conter metadados de cada indicador."""
        indicators = _sample_indicators()
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert "indicatorsMeta" in data
        meta = data["indicatorsMeta"]
        assert len(meta) == 8

    def test_indicator_meta_has_total_points(self, tmp_output_dir):
        """Metadados devem conter totalPoints por indicador."""
        indicators = {"selic": [_p("2024-01", 11.75), _p("2024-02", 11.25)]}
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert data["indicatorsMeta"]["selic"]["totalPoints"] == 2

    def test_indicator_meta_has_latest_value(self, tmp_output_dir):
        """Metadados devem conter latestValue e latestDate."""
        indicators = {"selic": [_p("2024-01", 11.75), _p("2024-02", 11.25)]}
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        selic_meta = data["indicatorsMeta"]["selic"]
        assert selic_meta["latestValue"] == 11.25
        assert selic_meta["latestDate"] == "2024-02"

    def test_empty_indicator_meta(self, tmp_output_dir):
        """Indicador sem pontos deve ter latestValue=0 e latestDate vazio."""
        indicators = {"selic": []}
        sources = []
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        selic_meta = data["indicatorsMeta"]["selic"]
        assert selic_meta["latestValue"] == 0
        assert selic_meta["latestDate"] == ""

    def test_source_status_values(self, tmp_output_dir):
        """Status das fontes deve refletir os valores passados."""
        indicators = {}
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        status_map = {s["id"]: s["status"] for s in data["sources"]}
        assert status_map["bcb"] == "success"
        assert status_map["anp"] == "error"


class TestJSONExporterDirectoryCreation:
    """T052: Criar diretório automaticamente."""

    def test_creates_missing_directory(self, tmp_path):
        """Deve criar diretório de saída se não existir."""
        new_dir = tmp_path / "subdir" / "output"
        assert not new_dir.exists()
        export_indicators(
            {"selic": [_p("2024-01", 11.0)]},
            str(new_dir),
        )
        assert new_dir.exists()
        assert (new_dir / "indicators.json").exists()

    def test_creates_missing_directory_governments(self, tmp_path):
        """Deve criar diretório pra governments.json."""
        new_dir = tmp_path / "gov_output"
        assert not new_dir.exists()
        export_governments(str(new_dir))
        assert (new_dir / "governments.json").exists()

    def test_creates_missing_directory_metadata(self, tmp_path):
        """Deve criar diretório pra metadata.json."""
        new_dir = tmp_path / "meta_output"
        assert not new_dir.exists()
        export_metadata({}, [], str(new_dir))
        assert (new_dir / "metadata.json").exists()


class TestJSONExporterFileSize:
    """T053: Validar tamanho do arquivo."""

    def test_json_under_1mb(self, tmp_output_dir):
        """Arquivo JSON gerado deve ser menor que 1MB."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        size = os.path.getsize(filepath)
        assert size < 1_000_000, f"indicators.json tem {size} bytes (> 1MB)"

    def test_metadata_under_1mb(self, tmp_output_dir):
        """metadata.json deve ser menor que 1MB."""
        indicators = _sample_indicators()
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        size = os.path.getsize(filepath)
        assert size < 1_000_000, f"metadata.json tem {size} bytes (> 1MB)"

    def test_governments_under_1mb(self, tmp_output_dir):
        """governments.json deve ser menor que 1MB."""
        filepath = export_governments(str(tmp_output_dir))
        size = os.path.getsize(filepath)
        assert size < 1_000_000, f"governments.json tem {size} bytes (> 1MB)"


class TestJSONExporterSchema:
    """T054: Conformidade com schema do ARCHITECTURE.md."""

    def test_indicators_json_matches_schema(self, tmp_output_dir):
        """indicators.json deve seguir o schema IndicatorsData."""
        indicators = _sample_indicators()
        filepath = export_indicators(indicators, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        # Top-level: lastUpdated (str), period (obj), indicators (obj)
        assert isinstance(data["lastUpdated"], str)
        assert isinstance(data["period"], dict)
        assert isinstance(data["period"]["start"], str)
        assert isinstance(data["period"]["end"], str)
        assert isinstance(data["indicators"], dict)
        # Cada indicador é uma lista de {date, value}
        for key, points in data["indicators"].items():
            assert isinstance(points, list)
            for pt in points:
                assert isinstance(pt["date"], str)
                assert isinstance(pt["value"], (int, float))

    def test_metadata_json_matches_schema(self, tmp_output_dir):
        """metadata.json deve seguir o schema MetadataData."""
        indicators = _sample_indicators()
        sources = _sample_sources()
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        # Top-level: lastUpdated, sources, indicatorsMeta
        assert isinstance(data["lastUpdated"], str)
        assert isinstance(data["sources"], list)
        assert isinstance(data["indicatorsMeta"], dict)
        # Cada source tem campos obrigatórios
        for src in data["sources"]:
            assert isinstance(src["id"], str)
            assert isinstance(src["name"], str)
            assert isinstance(src["url"], str)
            assert isinstance(src["lastFetch"], str)
            assert isinstance(src["status"], str)
        # Cada indicatorMeta tem totalPoints, latestValue, latestDate
        for key, meta in data["indicatorsMeta"].items():
            assert "totalPoints" in meta
            assert "latestValue" in meta
            assert "latestDate" in meta

    def test_governments_json_matches_schema(self, tmp_output_dir):
        """governments.json deve seguir o schema esperado."""
        filepath = export_governments(str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data["governments"], list)
        for gov in data["governments"]:
            assert isinstance(gov["id"], str)
            assert isinstance(gov["name"], str)
            assert isinstance(gov["president"], str)
            assert isinstance(gov["start"], str)
            assert isinstance(gov["end"], str)
            assert isinstance(gov["color"], str)
            # Cores devem ser hex
            assert gov["color"].startswith("#")

    def test_indicator_meta_has_static_fields(self, tmp_output_dir):
        """indicatorsMeta deve conter campos estáticos (label, unit, etc)."""
        indicators = {"selic": [_p("2024-01", 11.75)]}
        sources = []
        filepath = export_metadata(indicators, sources, str(tmp_output_dir))
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        selic_meta = data["indicatorsMeta"]["selic"]
        assert selic_meta["label"] == "Taxa Selic"
        assert selic_meta["unit"] == "% a.a."
        assert selic_meta["source"] == "bcb"
        assert "description" in selic_meta
        assert "color" in selic_meta
