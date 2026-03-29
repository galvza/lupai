"""Extrator de preços de gasolina dos CSVs da ANP.

Baixa e parseia CSVs de série histórica de preços de combustíveis
da ANP, filtrando GASOLINA COMUM e agregando em média mensal nacional.
"""

import logging
import zipfile
from io import BytesIO, StringIO

import pandas as pd

from src.models.indicators import MonthlyDataPoint
from src.utils.http_client import fetch_bytes, fetch_text

logger = logging.getLogger(__name__)

BASE_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/dsas/ca"

# Timeout maior pra downloads da ANP (CSVs podem ter dezenas de MB)
ANP_TIMEOUT = 120

PRODUCT_FILTERS = {"GASOLINA COMUM", "GASOLINA"}

REQUIRED_COLUMNS = ["Produto", "Data da Coleta", "Valor de Venda"]


def _parse_date(date_str: str) -> str | None:
    """Converte data dd/mm/aaaa da ANP pra formato YYYY-MM.

    Args:
        date_str: Data como string (ex: "01/01/2024").

    Returns:
        Data no formato "YYYY-MM" ou None se inválido.
    """
    if not isinstance(date_str, str) or not date_str.strip():
        return None
    parts = date_str.strip().split("/")
    if len(parts) != 3:
        return None
    try:
        _day, month, year = parts
        month_int = int(month)
        year_int = int(year)
        if not (1 <= month_int <= 12) or year_int < 1900:
            return None
        return f"{year_int:04d}-{month_int:02d}"
    except ValueError:
        return None


def _parse_price(raw: object) -> float | None:
    """Converte preço da ANP pra float.

    Trata formato brasileiro (vírgula decimal) e americano (ponto decimal).

    Args:
        raw: Valor bruto (string ou numérico).

    Returns:
        Preço como float ou None se inválido.
    """
    if pd.isna(raw):
        return None
    raw_str = str(raw).strip()
    if not raw_str:
        return None
    cleaned = raw_str.replace(",", ".")
    try:
        value = float(cleaned)
        if value <= 0:
            return None
        return value
    except ValueError:
        return None


class ANPExtractor:
    """Extrator de preço médio da gasolina comum dos CSVs da ANP.

    Attributes:
        base_url: URL base do diretório de arquivos da ANP.
    """

    def __init__(self, base_url: str = BASE_URL) -> None:
        """Inicializa o extrator.

        Args:
            base_url: URL base pra construção dos links de download.
        """
        self.base_url = base_url

    def _build_csv_url(self, year: int, semester: int) -> str:
        """Constrói URL de download do CSV de um semestre.

        Args:
            year: Ano do semestre.
            semester: Número do semestre (1 ou 2).

        Returns:
            URL completa do CSV.
        """
        return f"{self.base_url}/ca-{year}-{semester:02d}.csv"

    def _build_zip_url(self, year: int, semester: int) -> str:
        """Constrói URL de download do ZIP de um semestre.

        O 1º semestre de 2022 tem nome especial no site da ANP.

        Args:
            year: Ano do semestre.
            semester: Número do semestre (1 ou 2).

        Returns:
            URL completa do ZIP.
        """
        if year == 2022 and semester == 1:
            return f"{self.base_url}/precos-semestrais-ca.zip"
        return f"{self.base_url}/ca-{year}-{semester:02d}.zip"

    def _semester_range(
        self, start_year: int, end_year: int
    ) -> list[tuple[int, int]]:
        """Gera lista de semestres a baixar.

        Args:
            start_year: Ano inicial.
            end_year: Ano final.

        Returns:
            Lista de tuplas (ano, semestre).
        """
        semesters: list[tuple[int, int]] = []
        for year in range(start_year, end_year + 1):
            semesters.extend([(year, 1), (year, 2)])
        return semesters

    def _fetch_csv_text(self, url: str) -> str:
        """Busca conteúdo CSV via HTTP.

        Args:
            url: URL do CSV.

        Returns:
            Conteúdo do CSV como texto.

        Raises:
            requests.exceptions.RequestException: Após esgotar tentativas.
        """
        logger.info("Baixando CSV da ANP: %s", url)
        return fetch_text(url, timeout=ANP_TIMEOUT)

    def _fetch_csv_from_zip(self, url: str) -> str:
        """Baixa ZIP e extrai o CSV de dentro.

        Args:
            url: URL do arquivo ZIP.

        Returns:
            Conteúdo do CSV extraído como texto.

        Raises:
            requests.exceptions.RequestException: Após esgotar tentativas.
            zipfile.BadZipFile: Se o arquivo não for um ZIP válido.
        """
        logger.info("Baixando ZIP da ANP: %s", url)
        content = fetch_bytes(url, timeout=ANP_TIMEOUT)
        with zipfile.ZipFile(BytesIO(content)) as zf:
            csv_names = [n for n in zf.namelist() if n.endswith(".csv")]
            if not csv_names:
                raise ValueError(f"Nenhum CSV encontrado dentro do ZIP: {url}")
            csv_name = csv_names[0]
            raw = zf.read(csv_name)
            # Tentar UTF-8 primeiro, fallback pra latin-1
            for encoding in ("utf-8", "latin-1"):
                try:
                    return raw.decode(encoding)
                except UnicodeDecodeError:
                    continue
            return raw.decode("latin-1", errors="replace")

    def _fetch_semester(self, year: int, semester: int) -> str:
        """Tenta baixar CSV de um semestre (ZIP ou CSV direto).

        Prioriza ZIP (mais confiável, arquivos menores), com
        fallback pra CSV direto pra anos que não têm ZIP.

        Args:
            year: Ano do semestre.
            semester: Número do semestre (1 ou 2).

        Returns:
            Conteúdo CSV como texto.

        Raises:
            Exception: Se nenhum formato funcionar.
        """
        # Tentar ZIP primeiro (2022+ tem ZIP, mais confiável)
        zip_url = self._build_zip_url(year, semester)
        try:
            return self._fetch_csv_from_zip(zip_url)
        except Exception:
            pass

        # Fallback pra CSV direto (2004-2021, arquivos grandes)
        csv_url = self._build_csv_url(year, semester)
        return self._fetch_csv_text(csv_url)

    def _parse_csv(self, content: str) -> pd.DataFrame:
        """Parseia conteúdo CSV em DataFrame.

        Args:
            content: Texto CSV com separador ponto-e-vírgula.

        Returns:
            DataFrame com todas as colunas como string.
        """
        return pd.read_csv(
            StringIO(content),
            sep=";",
            dtype=str,
            on_bad_lines="skip",
        )

    def _validate_columns(self, df: pd.DataFrame) -> None:
        """Valida que as colunas obrigatórias existem no DataFrame.

        Args:
            df: DataFrame parseado do CSV.

        Raises:
            ValueError: Se alguma coluna obrigatória estiver ausente.
        """
        missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(
                f"Colunas obrigatórias ausentes no CSV da ANP: {missing}. "
                f"Colunas encontradas: {list(df.columns)}"
            )

    def _process(
        self, df: pd.DataFrame, start_year: int, end_year: int
    ) -> list[MonthlyDataPoint]:
        """Filtra, agrega e converte DataFrame pra MonthlyDataPoint.

        Args:
            df: DataFrame combinado de todos os CSVs.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.

        Raises:
            ValueError: Se colunas obrigatórias estiverem ausentes.
        """
        self._validate_columns(df)

        # Filtrar gasolina (aceita "GASOLINA COMUM" e "GASOLINA")
        df = df[df["Produto"].str.strip().isin(PRODUCT_FILTERS)].copy()
        if df.empty:
            logger.warning("Nenhum registro de gasolina encontrado")
            return []

        # Converter datas
        df["_date"] = df["Data da Coleta"].apply(_parse_date)
        df = df.dropna(subset=["_date"])

        # Converter preços
        df["_price"] = df["Valor de Venda"].apply(_parse_price)
        df = df.dropna(subset=["_price"])

        if df.empty:
            return []

        # Filtrar pelo período
        df["_year"] = df["_date"].str[:4].astype(int)
        df = df[(df["_year"] >= start_year) & (df["_year"] <= end_year)]

        if df.empty:
            return []

        # Agregar média mensal nacional
        monthly = df.groupby("_date")["_price"].mean()

        points = [
            MonthlyDataPoint(date=date, value=round(price, 4))
            for date, price in sorted(monthly.items())
        ]

        logger.info(
            "Extraídos %d pontos de gasolina (%d-%d)",
            len(points),
            start_year,
            end_year,
        )
        return points

    def extract(
        self,
        start_year: int = 2005,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai preço médio mensal nacional da gasolina comum.

        Args:
            start_year: Ano inicial da extração.
            end_year: Ano final da extração.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.

        Raises:
            ValueError: Se colunas obrigatórias estiverem ausentes no CSV.
            requests.exceptions.RequestException: Após esgotar tentativas HTTP.
        """
        all_dfs: list[pd.DataFrame] = []

        for year, semester in self._semester_range(start_year, end_year):
            try:
                content = self._fetch_semester(year, semester)
                df = self._parse_csv(content)
                all_dfs.append(df)
            except Exception as exc:
                logger.warning(
                    "Erro ao processar CSV %d-%d: %s", year, semester, exc
                )
                continue

        if not all_dfs:
            logger.warning("Nenhum CSV válido encontrado pra gasolina")
            return []

        combined = pd.concat(all_dfs, ignore_index=True)
        return self._process(combined, start_year, end_year)
