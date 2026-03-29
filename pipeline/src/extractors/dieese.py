"""Extrator de dados de cesta básica do DIEESE via scraping.

Faz POST no formulário do DIEESE pra obter o preço mensal da
cesta básica em São Paulo no período solicitado.
"""

import logging
import re
import warnings

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from src.models.indicators import MonthlyDataPoint
from src.utils.http_client import post_form

logger = logging.getLogger(__name__)

URL = "https://www.dieese.org.br/cesta/"

MONTHS: dict[str, str] = {
    "Jan": "01",
    "Fev": "02",
    "Mar": "03",
    "Abr": "04",
    "Mai": "05",
    "Jun": "06",
    "Jul": "07",
    "Ago": "08",
    "Set": "09",
    "Out": "10",
    "Nov": "11",
    "Dez": "12",
}

# Código da cidade de São Paulo no formulário do DIEESE
SAO_PAULO_CODE = "8"


def _parse_month_header(header: str) -> str | None:
    """Converte cabeçalho de mês do DIEESE pra formato YYYY-MM.

    Args:
        header: Texto do cabeçalho (ex: "Jan/2024").

    Returns:
        Data no formato "YYYY-MM" ou None se inválido.
    """
    header = header.strip()
    match = re.match(r"^(\w{3})/(\d{4})$", header)
    if not match:
        return None
    month_abbr, year = match.groups()
    month_num = MONTHS.get(month_abbr)
    if month_num is None:
        return None
    return f"{year}-{month_num}"


def _parse_date_row(date_str: str) -> str | None:
    """Converte data de linha da tabela DIEESE pra formato YYYY-MM.

    Aceita formatos "MM-YYYY" e "MM/YYYY".

    Args:
        date_str: Data como string (ex: "01-2024" ou "01/2024").

    Returns:
        Data no formato "YYYY-MM" ou None se inválido.
    """
    date_str = date_str.strip()
    match = re.match(r"^(\d{2})[-/](\d{4})$", date_str)
    if not match:
        return None
    month, year = match.groups()
    month_int = int(month)
    if not (1 <= month_int <= 12):
        return None
    return f"{year}-{month}"


def _parse_value(raw: str) -> float | None:
    """Converte valor monetário do DIEESE pra float.

    Trata vírgula decimal brasileira, asterisco de revisão e traço.

    Args:
        raw: Valor como string (ex: "708,53", "789,45*", "-", "").

    Returns:
        Valor float ou None se inválido.
    """
    if not raw or not raw.strip():
        return None
    cleaned = raw.strip().rstrip("*").strip()
    if not cleaned or cleaned == "-":
        return None
    if "," in cleaned:
        # Formato brasileiro: ponto é milhar, vírgula é decimal
        cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        value = float(cleaned)
        if value <= 0:
            return None
        return value
    except ValueError:
        return None


class DIEESEExtractor:
    """Extrator de preço da cesta básica do site do DIEESE.

    Faz POST no endpoint /cesta/cidade pra obter série temporal
    do gasto mensal com a cesta básica em São Paulo.

    Attributes:
        url: URL base do DIEESE (sem o endpoint específico).
    """

    def __init__(self, url: str = URL) -> None:
        """Inicializa o extrator.

        Args:
            url: URL base da cesta básica (permite override pra testes).
        """
        self.url = url

    def _fetch_data(self, start_year: int, end_year: int) -> str:
        """Faz POST pra obter dados de SP no período.

        Args:
            start_year: Ano inicial.
            end_year: Ano final.

        Returns:
            HTML da resposta com tabela de dados.

        Raises:
            requests.exceptions.RequestException: Após esgotar tentativas.
        """
        form_url = f"{self.url}cidade"
        data = {
            "farinha": "true",
            "cidades": SAO_PAULO_CODE,
            "tipoDado": "5",
            "produtos": "1",
            "dataInicial": f"01{start_year}",
            "dataFinal": f"12{end_year}",
        }
        logger.info(
            "Buscando cesta básica SP de %d a %d no DIEESE...",
            start_year,
            end_year,
        )
        return post_form(form_url, data=data)

    def _find_table(self, soup: BeautifulSoup) -> BeautifulSoup:
        """Localiza a tabela de dados na resposta.

        Procura primeiro por id="dados" (endpoint POST), depois
        por class="tabela" (fallback).

        Args:
            soup: Objeto BeautifulSoup da página.

        Returns:
            Elemento da tabela.

        Raises:
            ValueError: Se tabela não encontrada.
        """
        table = soup.find("table", id="dados")
        if table is None:
            table = soup.find("table", class_="tabela")
        if table is None:
            raise ValueError(
                "Tabela de cesta básica não encontrada na página do DIEESE. "
                "A estrutura do site pode ter mudado."
            )
        return table

    def _parse_table(
        self, table: BeautifulSoup, start_year: int, end_year: int
    ) -> list[MonthlyDataPoint]:
        """Extrai pontos de dados da tabela.

        Suporta dois formatos:
        - POST /cidade: linhas são datas (MM-YYYY), colunas são produtos.
        - Legado (tabela): linhas são cidades, colunas são meses.

        Args:
            table: Elemento da tabela.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.
        """
        tbody = table.find("tbody")
        if tbody is None:
            return []

        rows = tbody.find_all("tr")
        if not rows:
            return []

        # Detectar formato: se a primeira célula da primeira linha é uma data,
        # é o formato POST (linhas=datas). Senão, é formato legado (linhas=cidades).
        first_row = rows[0]
        first_cells = first_row.find_all("td")
        if not first_cells:
            return []

        first_cell_text = first_cells[0].get_text(strip=True)

        if _parse_date_row(first_cell_text) is not None:
            return self._parse_date_rows(rows, start_year, end_year)
        return self._parse_city_rows(table, start_year, end_year)

    def _parse_date_rows(
        self,
        rows: list,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Parseia tabela onde linhas são datas (formato POST /cidade).

        Args:
            rows: Lista de elementos <tr>.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.
        """
        points: list[MonthlyDataPoint] = []
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            date = _parse_date_row(cells[0].get_text(strip=True))
            if date is None:
                continue
            year = int(date[:4])
            if year < start_year or year > end_year:
                continue
            value = _parse_value(cells[1].get_text())
            if value is None:
                continue
            points.append(MonthlyDataPoint(date=date, value=value))
        return sorted(points, key=lambda p: p.date)

    def _parse_city_rows(
        self,
        table: BeautifulSoup,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Parseia tabela legada onde linhas são cidades e colunas são meses.

        Args:
            table: Elemento da tabela completa (precisa do thead).
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.
        """
        # Extrair datas dos cabeçalhos
        thead = table.find("thead")
        if thead is None:
            return []
        headers = thead.find_all("th")
        dates = [_parse_month_header(th.get_text()) for th in headers[1:]]

        # Encontrar linha de SP
        tbody = table.find("tbody")
        if tbody is None:
            return []
        sp_row = None
        cities: list[str] = []
        for row in tbody.find_all("tr"):
            cells = row.find_all("td")
            if not cells:
                continue
            city = cells[0].get_text(strip=True)
            cities.append(city)
            if "São Paulo" in city:
                sp_row = row
        if sp_row is None:
            raise ValueError(
                f"Coluna de São Paulo não encontrada na tabela do DIEESE. "
                f"Cidades disponíveis: {cities}"
            )

        cells = sp_row.find_all("td")
        value_cells = cells[1:]
        points: list[MonthlyDataPoint] = []
        for i, cell in enumerate(value_cells):
            if i >= len(dates) or dates[i] is None:
                continue
            value = _parse_value(cell.get_text())
            if value is None:
                continue
            year = int(dates[i][:4])
            if year < start_year or year > end_year:
                continue
            points.append(MonthlyDataPoint(date=dates[i], value=value))
        return sorted(points, key=lambda p: p.date)

    def extract(
        self,
        start_year: int = 2005,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai preço da cesta básica em São Paulo.

        Args:
            start_year: Ano inicial da extração.
            end_year: Ano final da extração.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.

        Raises:
            ValueError: Se tabela não encontrada na resposta.
            requests.exceptions.RequestException: Após esgotar tentativas HTTP.
        """
        html = self._fetch_data(start_year, end_year)
        soup = BeautifulSoup(html, "lxml")
        table = self._find_table(soup)
        points = self._parse_table(table, start_year, end_year)
        logger.info(
            "Extraídos %d pontos de cesta básica SP (%d-%d)",
            len(points),
            start_year,
            end_year,
        )
        return points
