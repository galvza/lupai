"""Fixtures compartilhadas para os testes do pipeline."""

import json
from pathlib import Path

import pytest


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(filename: str) -> str:
    """Carrega conteúdo de um arquivo de fixture como string.

    Args:
        filename: Nome do arquivo dentro do diretório fixtures/.

    Returns:
        Conteúdo do arquivo como string.

    Raises:
        FileNotFoundError: Se o arquivo de fixture não existir.
    """
    filepath = FIXTURES_DIR / filename
    return filepath.read_text(encoding="utf-8")


def load_json_fixture(filename: str) -> dict:
    """Carrega um arquivo de fixture JSON e retorna como dicionário.

    Args:
        filename: Nome do arquivo JSON dentro do diretório fixtures/.

    Returns:
        Conteúdo do arquivo parseado como dicionário.
    """
    content = load_fixture(filename)
    return json.loads(content)


# ==================== Fixtures BCB ====================


@pytest.fixture
def bcb_fixtures() -> dict:
    """Retorna todas as fixtures de respostas da API do BCB.

    Contém as chaves:
    - selic_valid: série Selic com 6 pontos válidos
    - ipca_valid: série IPCA com 6 pontos válidos
    - dolar_valid: série dólar com 6 pontos válidos
    - salario_minimo_valid: série salário mínimo com 2 pontos
    - empty_response: lista vazia
    - malformed_response: dados com formatos inválidos
    - single_point: série com apenas 1 ponto
    - duplicate_dates: série com datas duplicadas
    - two_chunks_first: primeira metade pra teste de concatenação
    - two_chunks_second: segunda metade pra teste de concatenação
    """
    return load_json_fixture("bcb_responses.json")


@pytest.fixture
def bcb_selic_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra Selic."""
    return bcb_fixtures["selic_valid"]


@pytest.fixture
def bcb_ipca_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra IPCA."""
    return bcb_fixtures["ipca_valid"]


@pytest.fixture
def bcb_dolar_daily(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra dólar (dados diários)."""
    return bcb_fixtures["dolar_daily"]


@pytest.fixture
def bcb_salario_minimo_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra salário mínimo."""
    return bcb_fixtures["salario_minimo_valid"]


@pytest.fixture
def bcb_empty_response(bcb_fixtures: dict) -> list:
    """Retorna resposta vazia da API do BCB."""
    return bcb_fixtures["empty_response"]


@pytest.fixture
def bcb_malformed_response(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta malformada da API do BCB."""
    return bcb_fixtures["malformed_response"]


@pytest.fixture
def bcb_single_point(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta com um único ponto de dados."""
    return bcb_fixtures["single_point"]


@pytest.fixture
def bcb_duplicate_dates(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta com datas duplicadas."""
    return bcb_fixtures["duplicate_dates"]


@pytest.fixture
def bcb_two_chunks(bcb_fixtures: dict) -> tuple[list[dict], list[dict]]:
    """Retorna dois chunks pra teste de concatenação de períodos."""
    return bcb_fixtures["two_chunks_first"], bcb_fixtures["two_chunks_second"]


@pytest.fixture
def bcb_endividamento_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra endividamento."""
    return bcb_fixtures["endividamento_valid"]


@pytest.fixture
def bcb_inadimplencia_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra inadimplência."""
    return bcb_fixtures["inadimplencia_valid"]


@pytest.fixture
def bcb_pib_valid(bcb_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API do BCB pra PIB trimestral."""
    return bcb_fixtures["pib_valid"]


# ==================== Fixtures DIEESE ====================


@pytest.fixture
def dieese_html_raw() -> str:
    """Retorna o HTML completo do arquivo de fixtures DIEESE."""
    return load_fixture("dieese_responses.html")


@pytest.fixture
def dieese_tabela_valida_com_sp(dieese_html_raw: str) -> str:
    """Retorna HTML com tabela válida incluindo São Paulo."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(dieese_html_raw, "lxml")
    div = soup.find("div", id="tabela_valida_com_sp")
    return str(div)


@pytest.fixture
def dieese_tabela_sem_sp(dieese_html_raw: str) -> str:
    """Retorna HTML com tabela válida mas sem São Paulo."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(dieese_html_raw, "lxml")
    div = soup.find("div", id="tabela_sem_sp")
    return str(div)


@pytest.fixture
def dieese_pagina_sem_tabela(dieese_html_raw: str) -> str:
    """Retorna HTML de página sem a tabela esperada."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(dieese_html_raw, "lxml")
    div = soup.find("div", id="pagina_sem_tabela")
    return str(div)


@pytest.fixture
def dieese_tabela_valores_invalidos(dieese_html_raw: str) -> str:
    """Retorna HTML com tabela contendo valores inválidos."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(dieese_html_raw, "lxml")
    div = soup.find("div", id="tabela_valores_invalidos")
    return str(div)


# ==================== Fixtures ANP ====================


@pytest.fixture
def anp_csv_raw() -> str:
    """Retorna o conteúdo completo do CSV mock da ANP."""
    return load_fixture("anp_responses.csv")


@pytest.fixture
def anp_csv_empty() -> str:
    """Retorna CSV da ANP apenas com header (sem dados)."""
    raw = load_fixture("anp_responses.csv")
    header = raw.split("\n")[0]
    return header + "\n"


@pytest.fixture
def anp_csv_latin1() -> bytes:
    """Retorna CSV da ANP codificado em latin-1 (ISO-8859-1)."""
    raw = load_fixture("anp_responses.csv")
    return raw.encode("latin-1")


# ==================== Fixtures Energia (IBGE SIDRA) ====================


@pytest.fixture
def energia_fixtures() -> dict:
    """Retorna todas as fixtures de respostas da API SIDRA."""
    return load_json_fixture("energia_responses.json")


@pytest.fixture
def energia_sidra_valid(energia_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API SIDRA pra energia elétrica."""
    return energia_fixtures["sidra_valid"]


# ==================== Fixtures FipeZAP ====================


@pytest.fixture
def fipezap_excel_bytes() -> bytes:
    """Retorna o conteúdo do Excel mock do FipeZAP como bytes."""
    filepath = FIXTURES_DIR / "fipezap_sample.xlsx"
    return filepath.read_bytes()


# ==================== Fixtures IBGE / PNAD ====================


@pytest.fixture
def ibge_desemprego_fixtures() -> dict:
    """Retorna todas as fixtures de respostas da API SIDRA (PNAD)."""
    return load_json_fixture("ibge_desemprego_response.json")


@pytest.fixture
def ibge_pnad_valid(ibge_desemprego_fixtures: dict) -> list[dict]:
    """Retorna resposta válida da API SIDRA pra taxa de desocupação."""
    return ibge_desemprego_fixtures["pnad_valid"]


# ==================== Fixtures utilitárias ====================


@pytest.fixture
def tmp_output_dir(tmp_path: Path) -> Path:
    """Retorna diretório temporário pra saída de arquivos."""
    output = tmp_path / "output"
    output.mkdir()
    return output
