"""Testes de integração do pipeline completo.

Cenários cobertos:
- T060: Pipeline completo com mocks de todas as APIs — deve gerar JSONs válidos
- T061: Pipeline com uma fonte falhando — deve gerar JSONs parciais com as fontes que funcionaram
- T062: Pipeline com todas as fontes falhando — deve falhar com erro descritivo
- T063: Pipeline gera output idêntico quando rodado 2x com mesmos dados — idempotência
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from main import run_pipeline
from src.models.indicators import MonthlyDataPoint


def _bcb_data() -> dict[str, list[MonthlyDataPoint]]:
    """Dados mock do BCB."""
    return {
        "selic": [
            MonthlyDataPoint(date="2024-01", value=11.75),
            MonthlyDataPoint(date="2024-02", value=11.25),
        ],
        "ipca": [
            MonthlyDataPoint(date="2024-01", value=4.51),
            MonthlyDataPoint(date="2024-02", value=4.50),
        ],
        "dolar": [
            MonthlyDataPoint(date="2024-01", value=4.87),
            MonthlyDataPoint(date="2024-02", value=4.97),
        ],
        "salario_minimo": [
            MonthlyDataPoint(date="2024-01", value=1412.0),
        ],
        "endividamento": [
            MonthlyDataPoint(date="2024-01", value=48.2),
            MonthlyDataPoint(date="2024-02", value=48.5),
        ],
        "inadimplencia": [
            MonthlyDataPoint(date="2024-01", value=3.5),
            MonthlyDataPoint(date="2024-02", value=3.4),
        ],
        "pib": [
            MonthlyDataPoint(date="2024-01", value=0.8),
            MonthlyDataPoint(date="2024-04", value=1.4),
        ],
    }


def _dieese_data() -> list[MonthlyDataPoint]:
    """Dados mock do DIEESE."""
    return [
        MonthlyDataPoint(date="2024-01", value=708.53),
        MonthlyDataPoint(date="2024-02", value=715.20),
    ]


def _anp_data() -> list[MonthlyDataPoint]:
    """Dados mock da ANP."""
    return [
        MonthlyDataPoint(date="2024-01", value=5.87),
        MonthlyDataPoint(date="2024-02", value=5.92),
    ]


def _fipezap_data() -> list[MonthlyDataPoint]:
    """Dados mock do FipeZAP."""
    return [
        MonthlyDataPoint(date="2024-01", value=0.73),
        MonthlyDataPoint(date="2024-02", value=0.85),
    ]


def _ibge_data() -> list[MonthlyDataPoint]:
    """Dados mock do IBGE SIDRA (energia elétrica)."""
    return [
        MonthlyDataPoint(date="2024-01", value=-0.64),
        MonthlyDataPoint(date="2024-02", value=0.14),
    ]


def _pnad_data() -> list[MonthlyDataPoint]:
    """Dados mock do IBGE PNAD (desemprego)."""
    return [
        MonthlyDataPoint(date="2024-02", value=7.8),
        MonthlyDataPoint(date="2024-05", value=7.1),
    ]


def _mock_all_sources():
    """Retorna patches para mockar todas as 6 fontes com sucesso."""
    bcb_mock = MagicMock()
    bcb_data = _bcb_data()
    bcb_mock.extract.side_effect = lambda ind, *a, **kw: bcb_data[ind]

    dieese_mock = MagicMock()
    dieese_mock.extract.return_value = _dieese_data()

    anp_mock = MagicMock()
    anp_mock.extract.return_value = _anp_data()

    fipezap_mock = MagicMock()
    fipezap_mock.extract.return_value = _fipezap_data()

    ibge_mock = MagicMock()
    ibge_mock.extract.return_value = _ibge_data()

    pnad_mock = MagicMock()
    pnad_mock.extract.return_value = _pnad_data()

    return bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock


def _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock):
    """Retorna contextos de patch para os 6 extractors."""
    return (
        patch("main.BCBExtractor", return_value=bcb_mock),
        patch("main.DIEESEExtractor", return_value=dieese_mock),
        patch("main.ANPExtractor", return_value=anp_mock),
        patch("main.FipeZAPExtractor", return_value=fipezap_mock),
        patch("main.EnergiaExtractor", return_value=ibge_mock),
        patch("main.IBGEExtractor", return_value=pnad_mock),
    )


class TestPipelineFullRun:
    """T060: Pipeline completo com mocks."""

    def test_generates_indicators_json(self, tmp_output_dir):
        """Deve gerar indicators.json com dados de todas as fontes."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(tmp_output_dir))
        filepath = tmp_output_dir / "indicators.json"
        assert filepath.exists()
        data = json.loads(filepath.read_text(encoding="utf-8"))
        assert "indicators" in data
        assert "lastUpdated" in data

    def test_generates_metadata_json(self, tmp_output_dir):
        """Deve gerar metadata.json com status de todas as fontes."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(tmp_output_dir))
        filepath = tmp_output_dir / "metadata.json"
        assert filepath.exists()
        data = json.loads(filepath.read_text(encoding="utf-8"))
        assert "sources" in data
        sources_ids = [s["id"] for s in data["sources"]]
        assert "bcb" in sources_ids
        assert "dieese" in sources_ids
        assert "anp" in sources_ids
        assert "pnad" in sources_ids
        for src in data["sources"]:
            assert src["status"] == "success"

    def test_generates_governments_json(self, tmp_output_dir):
        """Deve gerar governments.json."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(tmp_output_dir))
        filepath = tmp_output_dir / "governments.json"
        assert filepath.exists()
        data = json.loads(filepath.read_text(encoding="utf-8"))
        assert len(data["governments"]) == 7

    def test_all_twelve_indicators_populated(self, tmp_output_dir):
        """indicators.json deve ter dados em todas as 12 séries."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(tmp_output_dir))
        filepath = tmp_output_dir / "indicators.json"
        data = json.loads(filepath.read_text(encoding="utf-8"))
        indicators = data["indicators"]
        expected_keys = {
            "selic", "ipca", "dolar", "salarioMinimo",
            "cestaBasica", "gasolina", "endividamento", "inadimplencia",
            "aluguel", "energiaEletrica", "desemprego", "pib",
        }
        assert set(indicators.keys()) == expected_keys
        for key, points in indicators.items():
            assert len(points) > 0, f"Indicador {key} está vazio"

    def test_returns_pipeline_result(self, tmp_output_dir):
        """Deve retornar PipelineResult com indicadores e sem erros."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            result = run_pipeline(output_dir=str(tmp_output_dir))
        assert len(result.indicators) == 12
        assert result.errors == []

    def test_single_indicator_mode(self, tmp_output_dir):
        """--indicador selic deve extrair apenas a Selic."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            result = run_pipeline(
                output_dir=str(tmp_output_dir),
                indicator="selic",
            )
        assert "selic" in result.indicators
        assert len(result.indicators) == 1
        # DIEESE e ANP não devem ter sido chamados
        dieese_mock.extract.assert_not_called()
        anp_mock.extract.assert_not_called()


class TestPipelinePartialFailure:
    """T061: Pipeline com uma fonte falhando."""

    def test_generates_partial_data(self, tmp_output_dir):
        """Deve gerar JSONs com dados das fontes que funcionaram."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        # ANP falha
        anp_mock.extract.side_effect = ConnectionError("Timeout ANP")
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            result = run_pipeline(output_dir=str(tmp_output_dir))
        # Indicadores do BCB e DIEESE devem estar presentes
        assert "selic" in result.indicators
        assert "cesta_basica" in result.indicators
        # Gasolina não deve estar (ANP falhou)
        assert "gasolina" not in result.indicators
        # JSONs devem existir
        assert (tmp_output_dir / "indicators.json").exists()

    def test_metadata_shows_error_status(self, tmp_output_dir):
        """metadata.json deve indicar status 'error' pra fonte que falhou."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        anp_mock.extract.side_effect = ConnectionError("Timeout ANP")
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(tmp_output_dir))
        filepath = tmp_output_dir / "metadata.json"
        data = json.loads(filepath.read_text(encoding="utf-8"))
        status_map = {s["id"]: s["status"] for s in data["sources"]}
        assert status_map["bcb"] == "success"
        assert status_map["dieese"] == "success"
        assert status_map["anp"] == "error"

    def test_result_contains_errors(self, tmp_output_dir):
        """PipelineResult deve listar os erros das fontes que falharam."""
        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        dieese_mock.extract.side_effect = ValueError("Tabela não encontrada")
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            result = run_pipeline(output_dir=str(tmp_output_dir))
        assert len(result.errors) == 1
        assert "dieese" in result.errors[0]


class TestPipelineTotalFailure:
    """T062: Pipeline com todas as fontes falhando."""

    def test_raises_descriptive_error(self, tmp_output_dir):
        """Deve falhar com mensagem de erro descritiva."""
        bcb_mock = MagicMock()
        bcb_mock.extract.side_effect = ConnectionError("BCB offline")
        dieese_mock = MagicMock()
        dieese_mock.extract.side_effect = ConnectionError("DIEESE offline")
        anp_mock = MagicMock()
        anp_mock.extract.side_effect = ConnectionError("ANP offline")
        fipezap_mock = MagicMock()
        fipezap_mock.extract.side_effect = ConnectionError("FIPE offline")
        ibge_mock = MagicMock()
        ibge_mock.extract.side_effect = ConnectionError("IBGE offline")
        pnad_mock = MagicMock()
        pnad_mock.extract.side_effect = ConnectionError("PNAD offline")
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            with pytest.raises(RuntimeError, match="todas as fontes falharam"):
                run_pipeline(output_dir=str(tmp_output_dir))

    def test_error_lists_all_sources(self, tmp_output_dir):
        """Mensagem de erro deve listar todas as fontes que falharam."""
        bcb_mock = MagicMock()
        bcb_mock.extract.side_effect = ConnectionError("BCB offline")
        dieese_mock = MagicMock()
        dieese_mock.extract.side_effect = ConnectionError("DIEESE offline")
        anp_mock = MagicMock()
        anp_mock.extract.side_effect = ConnectionError("ANP offline")
        fipezap_mock = MagicMock()
        fipezap_mock.extract.side_effect = ConnectionError("FIPE offline")
        ibge_mock = MagicMock()
        ibge_mock.extract.side_effect = ConnectionError("IBGE offline")
        pnad_mock = MagicMock()
        pnad_mock.extract.side_effect = ConnectionError("PNAD offline")
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)
        with p1, p2, p3, p4, p5, p6:
            with pytest.raises(RuntimeError) as exc_info:
                run_pipeline(output_dir=str(tmp_output_dir))
        error_msg = str(exc_info.value)
        assert "bcb" in error_msg
        assert "dieese" in error_msg
        assert "anp" in error_msg
        assert "fipezap" in error_msg
        assert "ibge" in error_msg
        assert "pnad" in error_msg


class TestPipelineIdempotency:
    """T063: Idempotência do pipeline."""

    def test_same_input_same_output(self, tmp_path):
        """Rodar 2x com mesmos dados deve gerar output idêntico."""
        dir1 = tmp_path / "run1"
        dir2 = tmp_path / "run2"

        bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock = _mock_all_sources()
        p1, p2, p3, p4, p5, p6 = _patch_extractors(bcb_mock, dieese_mock, anp_mock, fipezap_mock, ibge_mock, pnad_mock)

        # Primeira execução
        with p1, p2, p3, p4, p5, p6:
            run_pipeline(output_dir=str(dir1))

        # Recriar mocks (side_effect se consome)
        bcb_mock2, dieese_mock2, anp_mock2, fipezap_mock2, ibge_mock2, pnad_mock2 = _mock_all_sources()
        p7, p8, p9, p10, p11, p12 = _patch_extractors(bcb_mock2, dieese_mock2, anp_mock2, fipezap_mock2, ibge_mock2, pnad_mock2)

        # Segunda execução
        with p7, p8, p9, p10, p11, p12:
            run_pipeline(output_dir=str(dir2))

        # Comparar indicators.json (sem lastUpdated que muda)
        ind1 = json.loads((dir1 / "indicators.json").read_text(encoding="utf-8"))
        ind2 = json.loads((dir2 / "indicators.json").read_text(encoding="utf-8"))
        assert ind1["indicators"] == ind2["indicators"]
        assert ind1["period"] == ind2["period"]

        # Comparar governments.json (estático, deve ser idêntico)
        gov1 = (dir1 / "governments.json").read_text(encoding="utf-8")
        gov2 = (dir2 / "governments.json").read_text(encoding="utf-8")
        assert gov1 == gov2
