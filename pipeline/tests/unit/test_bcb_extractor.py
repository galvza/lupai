"""Testes unitários do extrator da API do Banco Central (BCB).

Cenários cobertos:
- T001: Extrair série Selic com dados válidos — deve retornar lista de MonthlyDataPoint
- T002: Extrair série IPCA com dados válidos — deve retornar lista de MonthlyDataPoint
- T003: Extrair série Dólar com dados válidos — deve retornar média mensal
- T004: Extrair série Salário Mínimo com dados válidos — deve retornar lista de MonthlyDataPoint
- T005: API retorna lista vazia — deve retornar lista vazia sem erro
- T006: API retorna dados malformados (data inválida) — deve ignorar registros inválidos
- T007: API retorna dados malformados (valor vazio) — deve ignorar registros com valor ausente
- T008: API retorna dados malformados (campo faltando) — deve ignorar registros incompletos
- T009: Concatenação de 2 chunks (20 anos em 2 requests de 10) — deve mesclar sem duplicatas
- T010: Deduplicação por data quando chunks se sobrepõem — deve manter último valor
- T011: Conversão de data dd/MM/aaaa pra YYYY-MM — formato correto no output
- T012: Conversão de valor string pra float — valores numéricos corretos
- T013: Retry após falha HTTP 500 — deve tentar novamente até 3x
- T014: Timeout na API — deve respeitar timeout e fazer retry
- T015: API retorna um único ponto de dados — deve retornar lista com 1 elemento
"""

import re

import pytest
import responses

from src.extractors.bcb import BASE_URL, SERIES, BCBExtractor
from src.models.indicators import MonthlyDataPoint


def _mock_bcb(series_code: int, data: list, status: int = 200):
    """Helper: registra mock da API do BCB pra uma série."""
    url_pattern = re.compile(
        rf"{re.escape(BASE_URL)}\.{series_code}/dados"
    )
    responses.get(url_pattern, json=data, status=status)


class TestBCBExtractorSelicValid:
    """T001: Extrair série Selic com dados válidos."""

    @responses.activate
    def test_returns_list_of_data_points(self, bcb_selic_valid):
        """Deve retornar lista de MonthlyDataPoint."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert isinstance(result, list)
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_dates_in_yyyy_mm_format(self, bcb_selic_valid):
        """Todas as datas devem estar no formato YYYY-MM."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        for point in result:
            assert re.match(r"^\d{4}-\d{2}$", point.date)

    @responses.activate
    def test_values_are_floats(self, bcb_selic_valid):
        """Todos os valores devem ser float."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        for point in result:
            assert isinstance(point.value, float)

    @responses.activate
    def test_correct_number_of_points(self, bcb_selic_valid):
        """Quantidade de pontos retornados deve bater com o input."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert len(result) == 6


class TestBCBExtractorIPCAValid:
    """T002: Extrair série IPCA com dados válidos."""

    @responses.activate
    def test_returns_list_of_data_points(self, bcb_ipca_valid):
        """Deve retornar lista de MonthlyDataPoint."""
        _mock_bcb(SERIES["ipca"], bcb_ipca_valid)
        extractor = BCBExtractor()
        result = extractor.extract("ipca", 2024, 2025)
        assert isinstance(result, list)
        assert len(result) == 6
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_values_are_percentages(self, bcb_ipca_valid):
        """Valores do IPCA devem ser percentuais válidos."""
        _mock_bcb(SERIES["ipca"], bcb_ipca_valid)
        extractor = BCBExtractor()
        result = extractor.extract("ipca", 2024, 2025)
        for point in result:
            assert 0 <= point.value <= 100


class TestBCBExtractorDolarValid:
    """T003: Extrair série Dólar com dados válidos (média mensal de dados diários)."""

    @responses.activate
    def test_returns_monthly_aggregation(self, bcb_dolar_daily):
        """Deve agregar dados diários em média mensal."""
        _mock_bcb(SERIES["dolar"], bcb_dolar_daily)
        extractor = BCBExtractor()
        result = extractor.extract("dolar", 2024, 2025)
        # 9 registros diários em 3 meses (jan, fev, mar)
        assert len(result) == 3
        dates = [p.date for p in result]
        assert dates == ["2024-01", "2024-02", "2024-03"]

    @responses.activate
    def test_monthly_average_is_correct(self, bcb_dolar_daily):
        """Média mensal deve ser calculada corretamente."""
        _mock_bcb(SERIES["dolar"], bcb_dolar_daily)
        extractor = BCBExtractor()
        result = extractor.extract("dolar", 2024, 2025)
        # Janeiro: (4.8521 + 4.8900 + 4.8700 + 4.9100) / 4 = 4.880525
        jan = next(p for p in result if p.date == "2024-01")
        assert jan.value == pytest.approx(4.8805, abs=0.001)

    @responses.activate
    def test_values_are_exchange_rates(self, bcb_dolar_daily):
        """Valores do dólar devem ser taxas de câmbio razoáveis."""
        _mock_bcb(SERIES["dolar"], bcb_dolar_daily)
        extractor = BCBExtractor()
        result = extractor.extract("dolar", 2024, 2025)
        for point in result:
            assert 1.0 <= point.value <= 10.0


class TestBCBExtractorSalarioMinimoValid:
    """T004: Extrair série Salário Mínimo com dados válidos."""

    @responses.activate
    def test_returns_list_of_data_points(self, bcb_salario_minimo_valid):
        """Deve retornar lista de MonthlyDataPoint."""
        _mock_bcb(SERIES["salario_minimo"], bcb_salario_minimo_valid)
        extractor = BCBExtractor()
        result = extractor.extract("salario_minimo", 2024, 2025)
        assert len(result) == 2
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_values_are_currency(self, bcb_salario_minimo_valid):
        """Valores do salário mínimo devem ser em reais."""
        _mock_bcb(SERIES["salario_minimo"], bcb_salario_minimo_valid)
        extractor = BCBExtractor()
        result = extractor.extract("salario_minimo", 2024, 2025)
        for point in result:
            assert point.value >= 100


class TestBCBExtractorEmptyResponse:
    """T005: API retorna lista vazia."""

    @responses.activate
    def test_returns_empty_list(self):
        """Deve retornar lista vazia sem lançar exceção."""
        _mock_bcb(SERIES["selic"], [])
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert result == []


class TestBCBExtractorMalformedData:
    """T006-T008: API retorna dados malformados."""

    @responses.activate
    def test_ignores_invalid_dates(self, bcb_malformed_response):
        """T006: Deve ignorar registros com data inválida."""
        _mock_bcb(SERIES["selic"], bcb_malformed_response)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        # Dos 4 registros malformados, nenhum é válido
        assert len(result) == 0

    @responses.activate
    def test_ignores_empty_values(self, bcb_malformed_response):
        """T007: Deve ignorar registros com valor vazio."""
        _mock_bcb(SERIES["selic"], bcb_malformed_response)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        for point in result:
            assert isinstance(point.value, float)

    @responses.activate
    def test_ignores_missing_fields(self):
        """T008: Deve ignorar registros sem campos obrigatórios."""
        data = [
            {"data": "01/01/2024"},  # sem "valor"
            {"valor": "11.75"},  # sem "data"
            {},  # vazio
            {"data": "01/03/2024", "valor": "10.75"},  # válido
        ]
        _mock_bcb(SERIES["selic"], data)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert len(result) == 1
        assert result[0].date == "2024-03"
        assert result[0].value == 10.75


class TestBCBExtractorChunkConcatenation:
    """T009-T010: Concatenação e deduplicação de chunks."""

    @responses.activate
    def test_concatenates_two_chunks(self, bcb_two_chunks):
        """T009: Deve concatenar 2 chunks sem perder dados."""
        chunk1, chunk2 = bcb_two_chunks
        # date_range_chunks(2010, 2025) → [(2010, 2019), (2020, 2025)]
        # Primeiro request retorna chunk1, segundo retorna chunk2
        _mock_bcb(SERIES["selic"], chunk1)
        _mock_bcb(SERIES["selic"], chunk2)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2010, 2025)
        # chunk1 tem 4 pontos, chunk2 tem 4 pontos, 1 overlap (2015-06)
        assert len(result) == 7

    @responses.activate
    def test_deduplicates_overlapping_dates(self, bcb_two_chunks):
        """T010: Deve remover duplicatas na sobreposição dos chunks."""
        chunk1, chunk2 = bcb_two_chunks
        _mock_bcb(SERIES["selic"], chunk1)
        _mock_bcb(SERIES["selic"], chunk2)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2010, 2025)
        dates = [p.date for p in result]
        # Sem duplicatas
        assert len(dates) == len(set(dates))

    @responses.activate
    def test_preserves_order(self, bcb_two_chunks):
        """Resultado deve estar em ordem cronológica."""
        chunk1, chunk2 = bcb_two_chunks
        _mock_bcb(SERIES["selic"], chunk1)
        _mock_bcb(SERIES["selic"], chunk2)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2010, 2025)
        dates = [p.date for p in result]
        assert dates == sorted(dates)


class TestBCBExtractorDataConversion:
    """T011-T012: Conversão de formatos."""

    @responses.activate
    def test_date_conversion_dd_mm_yyyy_to_yyyy_mm(self, bcb_selic_valid):
        """T011: Deve converter dd/MM/aaaa pra YYYY-MM."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert result[0].date == "2024-01"
        assert result[-1].date == "2024-06"

    @responses.activate
    def test_value_conversion_string_to_float(self, bcb_selic_valid):
        """T012: Deve converter valor string pra float."""
        _mock_bcb(SERIES["selic"], bcb_selic_valid)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert result[0].value == 11.75
        assert result[2].value == 10.75

    @responses.activate
    def test_handles_brazilian_comma(self):
        """Deve converter vírgula brasileira pra ponto."""
        data = [{"data": "01/01/2024", "valor": "11,75"}]
        _mock_bcb(SERIES["selic"], data)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert result[0].value == 11.75


class TestBCBExtractorHTTPErrors:
    """T013-T014: Tratamento de erros HTTP."""

    @responses.activate
    def test_retries_on_http_500(self, bcb_selic_valid):
        """T013: Deve fazer retry após erro HTTP 500."""
        url_pattern = re.compile(
            rf"{re.escape(BASE_URL)}\.{SERIES['selic']}/dados"
        )
        responses.get(url_pattern, status=500)
        responses.get(url_pattern, json=bcb_selic_valid, status=200)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert len(result) == 6
        assert len(responses.calls) == 2

    @responses.activate
    def test_raises_after_all_retries_fail(self):
        """T014: Deve lançar exceção após esgotar tentativas."""
        url_pattern = re.compile(
            rf"{re.escape(BASE_URL)}\.{SERIES['selic']}/dados"
        )
        responses.get(url_pattern, status=500)
        responses.get(url_pattern, status=500)
        responses.get(url_pattern, status=500)
        extractor = BCBExtractor()
        with pytest.raises(Exception):
            extractor.extract("selic", 2024, 2025)


class TestBCBExtractorEdgeCases:
    """T015: Casos de borda."""

    @responses.activate
    def test_single_data_point(self, bcb_single_point):
        """T015: Deve retornar lista com 1 elemento quando só há 1 ponto."""
        _mock_bcb(SERIES["selic"], bcb_single_point)
        extractor = BCBExtractor()
        result = extractor.extract("selic", 2024, 2025)
        assert len(result) == 1
        assert result[0].date == "2024-06"
        assert result[0].value == 10.50

    def test_invalid_indicator_raises(self):
        """Deve lançar ValueError pra indicador desconhecido."""
        extractor = BCBExtractor()
        with pytest.raises(ValueError, match="Indicador desconhecido"):
            extractor.extract("inexistente", 2024, 2025)

    @responses.activate
    def test_extract_all_returns_seven_indicators(self, bcb_selic_valid):
        """extract_all deve retornar dicionário com 7 indicadores."""
        for code in SERIES.values():
            url_pattern = re.compile(
                rf"{re.escape(BASE_URL)}\.{code}/dados"
            )
            responses.get(url_pattern, json=bcb_selic_valid, status=200)
        extractor = BCBExtractor()
        result = extractor.extract_all(2024, 2025)
        assert set(result.keys()) == set(SERIES.keys())
        assert len(result) == 7
        for points in result.values():
            assert isinstance(points, list)


class TestBCBExtractorEndividamento:
    """Extração de endividamento das famílias (SGS 29037)."""

    @responses.activate
    def test_returns_valid_data_points(self, bcb_endividamento_valid):
        """Deve retornar lista de MonthlyDataPoint com valores corretos."""
        _mock_bcb(SERIES["endividamento"], bcb_endividamento_valid)
        extractor = BCBExtractor()
        result = extractor.extract("endividamento", 2024, 2025)
        assert len(result) == 3
        assert all(isinstance(p, MonthlyDataPoint) for p in result)
        assert result[0].date == "2024-01"
        assert result[0].value == 47.85
        assert result[2].value == 48.01


class TestBCBExtractorInadimplencia:
    """Extração de inadimplência da carteira de crédito (SGS 21082)."""

    @responses.activate
    def test_returns_valid_data_points(self, bcb_inadimplencia_valid):
        """Deve retornar lista de MonthlyDataPoint."""
        _mock_bcb(SERIES["inadimplencia"], bcb_inadimplencia_valid)
        extractor = BCBExtractor()
        result = extractor.extract("inadimplencia", 2024, 2025)
        assert len(result) == 3
        assert all(isinstance(p, MonthlyDataPoint) for p in result)
        assert result[0].value == 3.25

    @responses.activate
    def test_empty_for_period_before_series_start(self):
        """Período 2005-2010 retorna vazia sem erro (série começou em 2011)."""
        _mock_bcb(SERIES["inadimplencia"], [])
        extractor = BCBExtractor()
        result = extractor.extract("inadimplencia", 2005, 2010)
        assert result == []


class TestBCBExtractorPIB:
    """Extração do PIB trimestral (SGS 22109)."""

    @responses.activate
    def test_returns_valid_data_points(self, bcb_pib_valid):
        """Deve retornar lista de MonthlyDataPoint com valores corretos."""
        _mock_bcb(SERIES["pib"], bcb_pib_valid)
        extractor = BCBExtractor()
        result = extractor.extract("pib", 2024, 2025)
        assert len(result) == 4
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_quarterly_dates(self, bcb_pib_valid):
        """Datas devem corresponder aos trimestres (jan, abr, jul, out)."""
        _mock_bcb(SERIES["pib"], bcb_pib_valid)
        extractor = BCBExtractor()
        result = extractor.extract("pib", 2024, 2025)
        dates = [p.date for p in result]
        assert dates == ["2024-01", "2024-04", "2024-07", "2024-10"]

    @responses.activate
    def test_values_include_negative(self, bcb_pib_valid):
        """PIB pode ter valores negativos (contração)."""
        _mock_bcb(SERIES["pib"], bcb_pib_valid)
        extractor = BCBExtractor()
        result = extractor.extract("pib", 2024, 2025)
        assert result[0].value == pytest.approx(0.8)
        assert result[3].value == pytest.approx(-0.1)

    @responses.activate
    def test_values_are_percentages(self, bcb_pib_valid):
        """Valores do PIB devem ser variações percentuais razoáveis."""
        _mock_bcb(SERIES["pib"], bcb_pib_valid)
        extractor = BCBExtractor()
        result = extractor.extract("pib", 2024, 2025)
        for point in result:
            assert -20 <= point.value <= 20

    @responses.activate
    def test_series_code_is_22109(self):
        """Série do PIB deve ser 22109."""
        assert SERIES["pib"] == 22109
