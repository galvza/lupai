"""Testes unitários dos utilitários de data."""

import pytest

from src.utils.date_utils import date_range_chunks, format_bcb_date, parse_bcb_date


class TestParseBCBDate:
    """Testes de conversão dd/MM/aaaa → YYYY-MM."""

    def test_standard_date(self):
        """Deve converter data padrão corretamente."""
        assert parse_bcb_date("15/03/2024") == "2024-03"

    def test_first_day(self):
        """Deve converter primeiro dia do mês."""
        assert parse_bcb_date("01/01/2005") == "2005-01"

    def test_last_day(self):
        """Deve converter último dia do mês."""
        assert parse_bcb_date("31/12/2025") == "2025-12"

    def test_with_whitespace(self):
        """Deve tratar espaços em volta da data."""
        assert parse_bcb_date("  01/06/2020  ") == "2020-06"

    def test_invalid_format_raises(self):
        """Deve lançar ValueError pra formato inválido."""
        with pytest.raises(ValueError, match="Data inválida"):
            parse_bcb_date("2024-03-15")

    def test_empty_string_raises(self):
        """Deve lançar ValueError pra string vazia."""
        with pytest.raises(ValueError, match="Data inválida"):
            parse_bcb_date("")

    def test_gibberish_raises(self):
        """Deve lançar ValueError pra texto sem sentido."""
        with pytest.raises(ValueError, match="Data inválida"):
            parse_bcb_date("abc")

    def test_none_raises(self):
        """Deve lançar ValueError pra None."""
        with pytest.raises(ValueError, match="Data inválida"):
            parse_bcb_date(None)  # type: ignore[arg-type]

    def test_all_months(self):
        """Deve converter todos os 12 meses corretamente."""
        for month in range(1, 13):
            date_str = f"01/{month:02d}/2024"
            expected = f"2024-{month:02d}"
            assert parse_bcb_date(date_str) == expected


class TestFormatBCBDate:
    """Testes de geração de data no formato dd/MM/aaaa."""

    def test_standard_date(self):
        """Deve formatar data padrão."""
        assert format_bcb_date(2024, 3, 15) == "15/03/2024"

    def test_default_day(self):
        """Deve usar dia 1 como padrão."""
        assert format_bcb_date(2005, 1) == "01/01/2005"

    def test_last_month(self):
        """Deve formatar dezembro."""
        assert format_bcb_date(2025, 12, 31) == "31/12/2025"

    def test_invalid_month_raises(self):
        """Deve lançar ValueError pra mês inválido."""
        with pytest.raises(ValueError, match="Valores de data inválidos"):
            format_bcb_date(2024, 13)

    def test_invalid_day_raises(self):
        """Deve lançar ValueError pra dia inválido."""
        with pytest.raises(ValueError, match="Valores de data inválidos"):
            format_bcb_date(2024, 2, 30)


class TestDateRangeChunks:
    """Testes de divisão de período em chunks."""

    def test_twenty_years_three_chunks(self):
        """20 anos devem gerar 3 chunks (máx 10 anos cada)."""
        assert date_range_chunks(2005, 2025, 10) == [
            (2005, 2014),
            (2015, 2024),
            (2025, 2025),
        ]

    def test_within_single_chunk(self):
        """Período menor que max_span deve gerar 1 chunk."""
        assert date_range_chunks(2005, 2012, 10) == [(2005, 2012)]

    def test_exact_span(self):
        """Período igual ao max_span deve gerar 1 chunk."""
        assert date_range_chunks(2005, 2015, 10) == [(2005, 2014), (2015, 2015)]

    def test_thirty_years_four_chunks(self):
        """30 anos devem gerar 4 chunks."""
        assert date_range_chunks(2005, 2035, 10) == [
            (2005, 2014),
            (2015, 2024),
            (2025, 2034),
            (2035, 2035),
        ]

    def test_same_year(self):
        """Mesmo ano de início e fim deve gerar 1 chunk."""
        assert date_range_chunks(2005, 2005, 10) == [(2005, 2005)]

    def test_one_year_span(self):
        """Span de 1 ano deve gerar chunks unitários."""
        assert date_range_chunks(2005, 2008, 1) == [
            (2005, 2005),
            (2006, 2006),
            (2007, 2007),
            (2008, 2008),
        ]

    def test_start_after_end_raises(self):
        """Deve lançar ValueError se start > end."""
        with pytest.raises(ValueError, match="Ano inicial"):
            date_range_chunks(2025, 2005)

    def test_zero_span_raises(self):
        """Deve lançar ValueError se max_span < 1."""
        with pytest.raises(ValueError, match="Span máximo"):
            date_range_chunks(2005, 2025, 0)

    def test_negative_span_raises(self):
        """Deve lançar ValueError se max_span negativo."""
        with pytest.raises(ValueError, match="Span máximo"):
            date_range_chunks(2005, 2025, -5)
