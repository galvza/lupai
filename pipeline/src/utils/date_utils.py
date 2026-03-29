"""Utilitários de manipulação de datas pro pipeline.

Funções de conversão entre os formatos de data usados pelas APIs externas
(BCB, DIEESE, ANP) e o formato padronizado "YYYY-MM" do pipeline.
"""

from datetime import datetime


def parse_bcb_date(date_str: str) -> str:
    """Converte data do formato BCB "dd/MM/aaaa" pra "YYYY-MM".

    Args:
        date_str: Data no formato "dd/MM/aaaa" (ex: "15/03/2024").

    Returns:
        Data no formato "YYYY-MM" (ex: "2024-03").

    Raises:
        ValueError: Se a data estiver em formato inválido.
    """
    try:
        parsed = datetime.strptime(date_str.strip(), "%d/%m/%Y")
        return parsed.strftime("%Y-%m")
    except (ValueError, AttributeError) as exc:
        raise ValueError(
            f"Data inválida: '{date_str}'. Formato esperado: dd/MM/aaaa"
        ) from exc


def format_bcb_date(year: int, month: int, day: int = 1) -> str:
    """Gera data no formato BCB "dd/MM/aaaa".

    Args:
        year: Ano (ex: 2024).
        month: Mês (1-12).
        day: Dia (padrão: 1).

    Returns:
        Data no formato "dd/MM/aaaa" (ex: "01/03/2024").

    Raises:
        ValueError: Se os valores de data forem inválidos.
    """
    try:
        dt = datetime(year, month, day)
        return dt.strftime("%d/%m/%Y")
    except (ValueError, TypeError) as exc:
        raise ValueError(
            f"Valores de data inválidos: ano={year}, mês={month}, dia={day}"
        ) from exc


def date_range_chunks(
    start_year: int, end_year: int, max_span: int = 10
) -> list[tuple[int, int]]:
    """Divide um período em chunks de no máximo max_span anos.

    Necessário porque a API do BCB limita consultas a 10 anos por request.
    Os chunks se sobrepõem no ano de fronteira pra garantir cobertura completa.

    Args:
        start_year: Ano inicial (ex: 2005).
        end_year: Ano final (ex: 2025).
        max_span: Tamanho máximo de cada chunk em anos (padrão: 10).

    Returns:
        Lista de tuplas (ano_inicio, ano_fim).

    Raises:
        ValueError: Se start_year > end_year ou max_span < 1.

    Examples:
        >>> date_range_chunks(2005, 2025, 10)
        [(2005, 2014), (2015, 2024), (2025, 2025)]
        >>> date_range_chunks(2005, 2012, 10)
        [(2005, 2012)]
        >>> date_range_chunks(2005, 2035, 10)
        [(2005, 2014), (2015, 2024), (2025, 2034), (2035, 2035)]
    """
    if start_year > end_year:
        raise ValueError(
            f"Ano inicial ({start_year}) não pode ser maior que ano final ({end_year})"
        )
    if max_span < 1:
        raise ValueError(f"Span máximo deve ser >= 1, recebeu {max_span}")

    chunks: list[tuple[int, int]] = []
    current = start_year

    while current <= end_year:
        # max_span=10 → chunk cobre 10 anos inclusive (ex: 2005-2014)
        # A API do BCB conta dataInicial→dataFinal como janela completa
        chunk_end = min(current + max_span - 1, end_year)
        chunks.append((current, chunk_end))
        current = chunk_end + 1

    return chunks
