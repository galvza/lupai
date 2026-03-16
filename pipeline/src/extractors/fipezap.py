"""Extrator do Índice FipeZAP de locação residencial.

Baixa a série histórica do FipeZAP (variação mensal % do aluguel)
a partir do Excel disponível no site da FIPE, ou de arquivo local
como fallback.
"""

import io
import logging
from pathlib import Path

import pandas as pd

from src.models.indicators import MonthlyDataPoint
from src.utils.http_client import fetch_bytes

logger = logging.getLogger(__name__)

FIPEZAP_URL = "https://www.fipe.org.br/pt-br/indices/fipezap/"
LOCAL_FALLBACK = Path(__file__).parent.parent.parent / "data" / "fipezap_historico.xlsx"

# Nomes possíveis da coluna de variação mensal no Excel
VARIATION_COLUMNS = [
    "Variação Mensal",
    "Variação mensal",
    "variação mensal",
    "Var. Mensal",
    "Var. mensal",
    "Variação Mensal (%)",
]

# Nomes possíveis da coluna de data
DATE_COLUMNS = [
    "Data",
    "data",
    "Mês",
    "mes",
    "Período",
    "periodo",
    "Date",
]

# Filtro pra cidade de São Paulo (ou índice geral/nacional)
SP_FILTERS = [
    "São Paulo",
    "Sao Paulo",
    "SP",
    "Nacional",
    "Índice Geral",
    "Brasil",
]

# Headers pra evitar 403 em sites que bloqueiam User-Agent padrão do requests
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}


def _find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Encontra a primeira coluna que existe no DataFrame.

    Args:
        df: DataFrame com as colunas a verificar.
        candidates: Lista de nomes candidatos.

    Returns:
        Nome da coluna encontrada ou None.
    """
    for col in candidates:
        if col in df.columns:
            return col
    return None


def _parse_date_column(series: pd.Series) -> pd.Series:
    """Converte coluna de datas pra formato YYYY-MM.

    Suporta formatos: datetime, "YYYY-MM", "MM/YYYY", "Jan/2024", etc.

    Args:
        series: Série com valores de data.

    Returns:
        Série com datas no formato "YYYY-MM".
    """
    results = []
    for val in series:
        try:
            if isinstance(val, pd.Timestamp):
                results.append(val.strftime("%Y-%m"))
            elif hasattr(val, "strftime"):
                results.append(val.strftime("%Y-%m"))
            else:
                text = str(val).strip()
                # Tenta pd.to_datetime pra formatos comuns
                dt = pd.to_datetime(text, dayfirst=True)
                results.append(dt.strftime("%Y-%m"))
        except (ValueError, TypeError):
            results.append(None)
    return pd.Series(results)


def _parse_value(raw: object) -> float | None:
    """Converte valor bruto pra float.

    Suporta formato brasileiro com vírgula (ex: "1,23").

    Args:
        raw: Valor bruto (str, int, float).

    Returns:
        Valor como float ou None se inválido.
    """
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    try:
        if isinstance(raw, (int, float)):
            return float(raw)
        text = str(raw).strip().replace(",", ".")
        if text in ("", "-", "–", "—"):
            return None
        return float(text)
    except (ValueError, TypeError):
        return None


class FipeZAPExtractor:
    """Extrator da série histórica do Índice FipeZAP de locação.

    Estratégia:
    1. Tenta baixar o Excel do site da FIPE
    2. Se falhar, usa arquivo local como fallback
    3. Parseia o Excel e extrai variação mensal (%) de São Paulo
    """

    def __init__(
        self,
        url: str = FIPEZAP_URL,
        local_path: Path | str | None = LOCAL_FALLBACK,
    ) -> None:
        """Inicializa o extrator.

        Args:
            url: URL da página do FipeZAP na FIPE.
            local_path: Caminho do Excel local como fallback.
        """
        self.url = url
        self.local_path = Path(local_path) if local_path else None

    def _find_excel_link(self, html: str) -> str | None:
        """Procura link de download do Excel na página do FipeZAP.

        Args:
            html: HTML da página.

        Returns:
            URL do Excel ou None se não encontrado.
        """
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        for link in soup.find_all("a", href=True):
            href = str(link["href"]).lower()
            text = link.get_text(strip=True).lower()
            if any(ext in href for ext in [".xls", ".xlsx"]):
                if any(kw in text or kw in href for kw in ["locação", "locacao", "aluguel", "fipezap"]):
                    raw_href = str(link["href"])
                    if raw_href.startswith("/"):
                        return f"https://www.fipe.org.br{raw_href}"
                    return raw_href
        # Fallback: qualquer link Excel na página
        for link in soup.find_all("a", href=True):
            href = str(link["href"]).lower()
            if any(ext in href for ext in [".xls", ".xlsx"]):
                raw_href = str(link["href"])
                if raw_href.startswith("/"):
                    return f"https://www.fipe.org.br{raw_href}"
                return raw_href
        return None

    def _download_excel(self) -> bytes | None:
        """Tenta baixar o Excel do site da FIPE.

        Returns:
            Conteúdo do Excel em bytes ou None se falhar.
        """
        try:
            from src.utils.http_client import fetch_text

            html = fetch_text(self.url, headers=_BROWSER_HEADERS)
            excel_url = self._find_excel_link(html)
            if not excel_url:
                logger.warning("Link do Excel não encontrado na página do FipeZAP")
                return None
            logger.info("Baixando Excel do FipeZAP: %s", excel_url)
            return fetch_bytes(excel_url, timeout=60, headers=_BROWSER_HEADERS)
        except Exception as exc:
            logger.warning("Erro ao baixar Excel do FipeZAP: %s", exc)
            return None

    def _load_local(self) -> bytes | None:
        """Carrega Excel do arquivo local de fallback.

        Returns:
            Conteúdo do Excel em bytes ou None se não existir.
        """
        if self.local_path and self.local_path.exists():
            logger.info("Carregando Excel local: %s", self.local_path)
            return self.local_path.read_bytes()
        return None

    def _parse_excel(
        self,
        data: bytes,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Parseia o Excel e extrai a série de variação mensal.

        Tenta primeiro o formato multi-header do serieshistoricas.xlsx,
        depois fallback pra parser genérico por aba.

        Args:
            data: Conteúdo do Excel em bytes.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint com variação mensal.
        """
        buffer = io.BytesIO(data)

        # Tenta ler com openpyxl (xlsx) e xlrd (xls) como fallback
        try:
            xls = pd.ExcelFile(buffer, engine="openpyxl")
        except Exception:
            buffer.seek(0)
            try:
                xls = pd.ExcelFile(buffer)
            except Exception as exc:
                logger.error("Erro ao abrir Excel do FipeZAP: %s", exc)
                return []

        # Tenta parser multi-header (formato serieshistoricas.xlsx)
        points = self._try_parse_multiheader(xls, start_year, end_year)
        if points:
            return points

        # Fallback: tenta cada aba com parser genérico
        for sheet_name in xls.sheet_names:
            points = self._try_parse_sheet(xls, sheet_name, start_year, end_year)
            if points:
                logger.info(
                    "FipeZAP: %d pontos extraídos da aba '%s'",
                    len(points),
                    sheet_name,
                )
                return points

        logger.warning("Nenhuma aba do Excel contém dados válidos do FipeZAP")
        return []

    def _try_parse_multiheader(
        self,
        xls: pd.ExcelFile,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Parseia o formato multi-header do serieshistoricas.xlsx.

        Procura a aba "São Paulo" e extrai variação mensal de locação
        residencial a partir da estrutura com 4 linhas de cabeçalho.

        Args:
            xls: Arquivo Excel aberto.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ou lista vazia se o formato não bater.
        """
        # Procura aba de São Paulo
        sp_sheet = None
        for name in xls.sheet_names:
            if "paulo" in name.lower():
                sp_sheet = name
                break
        if not sp_sheet:
            return []

        try:
            df = pd.read_excel(xls, sheet_name=sp_sheet, header=None)
        except Exception:
            return []

        if df.shape[0] < 5 or df.shape[1] < 10:
            return []

        # Encontra coluna de "Var. mensal (%)" na seção Locação
        # Estrutura: Row 1 tem "Locação", Row 2 tem "Var. mensal (%)"
        locacao_start = None
        for j in range(df.shape[1]):
            val = df.iloc[1, j] if pd.notna(df.iloc[1, j]) else ""
            if isinstance(val, str) and "loca" in val.lower():
                locacao_start = j
                break

        if locacao_start is None:
            return []

        # Procura "Var. mensal" entre locacao_start e a próxima seção
        var_col = None
        for j in range(locacao_start, min(locacao_start + 20, df.shape[1])):
            val = df.iloc[2, j] if pd.notna(df.iloc[2, j]) else ""
            if isinstance(val, str) and "var" in val.lower() and "mensal" in val.lower():
                var_col = j
                break

        if var_col is None:
            return []

        # Coluna de data: geralmente coluna 1, linha 3 tem "Data"
        date_col = 1

        # Dados começam na linha 4 (após 4 linhas de cabeçalho)
        data_start = 4
        points: list[MonthlyDataPoint] = []

        for i in range(data_start, len(df)):
            raw_date = df.iloc[i, date_col]
            raw_value = df.iloc[i, var_col]

            # Parse date
            if pd.isna(raw_date):
                continue
            try:
                if isinstance(raw_date, pd.Timestamp):
                    date_str = raw_date.strftime("%Y-%m")
                elif hasattr(raw_date, "strftime"):
                    date_str = raw_date.strftime("%Y-%m")
                else:
                    dt = pd.to_datetime(str(raw_date).strip(), dayfirst=True)
                    date_str = dt.strftime("%Y-%m")
            except (ValueError, TypeError):
                continue

            # Parse value (variação mensal como fração, converter pra %)
            value = _parse_value(raw_value)
            if value is None:
                continue

            # Se valores são frações (< 1 em módulo), converter pra %
            # FipeZAP usa notação decimal: 0.01 = 1%
            if abs(value) < 1:
                value = value * 100

            # Filtra por ano
            try:
                year = int(date_str[:4])
            except (ValueError, TypeError):
                continue

            if start_year <= year <= end_year:
                points.append(MonthlyDataPoint(date=date_str, value=round(value, 4)))

        if points:
            logger.info(
                "FipeZAP: %d pontos extraídos da aba '%s' (multi-header)",
                len(points),
                sp_sheet,
            )

        return points

    def _try_parse_sheet(
        self,
        xls: pd.ExcelFile,
        sheet_name: str,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Tenta extrair dados de uma aba específica do Excel.

        Args:
            xls: Arquivo Excel aberto.
            sheet_name: Nome da aba.
            start_year: Ano inicial do filtro.
            end_year: Ano final do filtro.

        Returns:
            Lista de MonthlyDataPoint ou lista vazia se falhar.
        """
        try:
            df = pd.read_excel(xls, sheet_name=sheet_name)
        except Exception:
            return []

        if df.empty:
            return []

        # Encontra coluna de data
        date_col = _find_column(df, DATE_COLUMNS)
        if not date_col:
            # Tenta a primeira coluna se parecer com datas
            first_col = df.columns[0]
            try:
                sample = df[first_col].dropna().iloc[0]
                pd.to_datetime(sample)
                date_col = first_col
            except (ValueError, TypeError, IndexError):
                return []

        # Encontra coluna de valor (variação mensal)
        value_col = _find_column(df, VARIATION_COLUMNS)
        if not value_col:
            # Tenta segunda coluna numérica como fallback
            for col in df.columns[1:]:
                if df[col].dtype in ("float64", "int64"):
                    value_col = col
                    break
                # Tenta converter
                try:
                    pd.to_numeric(df[col].iloc[:5].replace(",", ".", regex=True))
                    value_col = col
                    break
                except (ValueError, TypeError):
                    continue

        if not value_col:
            return []

        # Converte datas
        dates = _parse_date_column(df[date_col])

        # Extrai pontos
        points: list[MonthlyDataPoint] = []
        for i in range(len(df)):
            date_str = dates.iloc[i]
            if date_str is None:
                continue

            value = _parse_value(df[value_col].iloc[i])
            if value is None:
                continue

            # Filtra por ano
            try:
                year = int(date_str[:4])
            except (ValueError, TypeError):
                continue

            if start_year <= year <= end_year:
                points.append(MonthlyDataPoint(date=date_str, value=value))

        # Ordena e deduplica por data
        seen: dict[str, MonthlyDataPoint] = {}
        for p in points:
            seen[p.date] = p
        return sorted(seen.values(), key=lambda p: p.date)

    def extract(
        self,
        start_year: int = 2008,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai a série histórica do FipeZAP de locação residencial.

        Tenta download remoto primeiro, fallback pra arquivo local.

        Args:
            start_year: Ano inicial (default 2008, início da série).
            end_year: Ano final.

        Returns:
            Lista de MonthlyDataPoint com variação mensal (%) do aluguel.
        """
        logger.info("Iniciando extração FipeZAP (%d-%d)...", start_year, end_year)

        # Tenta download remoto
        data = self._download_excel()

        # Fallback pra arquivo local
        if data is None:
            data = self._load_local()

        if data is None:
            logger.error(
                "FipeZAP: não foi possível obter o Excel "
                "(nem remoto nem local)"
            )
            return []

        points = self._parse_excel(data, start_year, end_year)
        logger.info("FipeZAP: %d pontos extraídos", len(points))
        return points
