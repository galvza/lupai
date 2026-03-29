"""Cliente HTTP com retry e backoff exponencial.

Todas as chamadas HTTP do pipeline passam por este módulo,
que garante retry automático e tratamento padronizado de erros.
"""

import logging
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 60
MAX_RETRIES = 3
BACKOFF_BASE = 2


def _is_permanent_error(exc: Exception) -> bool:
    """Verifica se o erro HTTP é permanente (4xx) e não deve ser retentado.

    Args:
        exc: Exceção capturada.

    Returns:
        True se for erro 4xx (permanente).
    """
    if isinstance(exc, requests.exceptions.HTTPError):
        if exc.response is not None and 400 <= exc.response.status_code < 500:
            return True
    return False


def _request_with_retry(
    method: str,
    url: str,
    params: dict | None = None,
    headers: dict | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
    backoff_base: int = BACKOFF_BASE,
) -> requests.Response:
    """Executa request HTTP com retry e backoff exponencial.

    Args:
        method: Método HTTP ("GET").
        url: URL de destino.
        params: Parâmetros de query string.
        headers: Headers HTTP customizados.
        timeout: Timeout em segundos por tentativa.
        max_retries: Número máximo de tentativas.
        backoff_base: Base do backoff exponencial em segundos.

    Returns:
        Objeto Response do requests.

    Raises:
        requests.exceptions.RequestException: Após esgotar todas as tentativas.
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Tentativa %d/%d pra %s", attempt, max_retries, url)
            response = requests.request(
                method,
                url,
                params=params,
                timeout=timeout,
                headers=headers or {},
            )
            response.raise_for_status()
            return response
        except (requests.exceptions.RequestException, ConnectionError) as exc:
            if _is_permanent_error(exc):
                logger.warning("Erro HTTP permanente pra %s: %s", url, exc)
                raise
            last_exception = exc
            logger.warning(
                "Erro na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = backoff_base ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)

    logger.error("Todas as %d tentativas falharam pra %s", max_retries, url)
    raise last_exception  # type: ignore[misc]


def fetch_json(
    url: str,
    params: dict | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
) -> dict | list:
    """Faz GET e retorna resposta parseada como JSON.

    Retenta se a resposta HTTP é 200 mas o corpo não é JSON válido
    (APIs como a do BCB às vezes retornam HTML ou corpo vazio).

    Args:
        url: URL da API.
        params: Parâmetros de query string.
        timeout: Timeout em segundos.
        max_retries: Número máximo de tentativas.

    Returns:
        Resposta JSON parseada (dict ou list).

    Raises:
        requests.exceptions.RequestException: Após esgotar tentativas.
        ValueError: Se resposta não for JSON válido após todas as tentativas.
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = _request_with_retry(
                "GET",
                url,
                params=params,
                headers={"Accept": "application/json"},
                timeout=timeout,
                max_retries=1,  # _request_with_retry não retenta; nós controlamos
            )
            return response.json()
        except (ValueError, requests.exceptions.JSONDecodeError) as exc:
            last_exception = exc
            logger.warning(
                "Resposta não-JSON na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = BACKOFF_BASE ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)
        except (requests.exceptions.RequestException, ConnectionError) as exc:
            if _is_permanent_error(exc):
                raise
            last_exception = exc
            logger.warning(
                "Erro na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = BACKOFF_BASE ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)

    logger.error("Todas as %d tentativas falharam pra %s", max_retries, url)
    raise last_exception  # type: ignore[misc]


def fetch_text(
    url: str,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
    headers: dict | None = None,
) -> str:
    """Faz GET e retorna resposta como texto.

    Usa streaming pra suportar respostas grandes sem
    erro de conexão interrompida.

    Args:
        url: URL de destino.
        timeout: Timeout em segundos.
        max_retries: Número máximo de tentativas.
        headers: Headers HTTP customizados.

    Returns:
        Conteúdo da resposta como string.

    Raises:
        requests.exceptions.RequestException: Após esgotar tentativas.
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Tentativa %d/%d pra %s", attempt, max_retries, url)
            response = requests.get(
                url, stream=True, timeout=timeout, headers=headers or {}
            )
            response.raise_for_status()
            chunks = []
            for chunk in response.iter_content(chunk_size=65536):
                chunks.append(chunk)
            raw = b"".join(chunks)
            return raw.decode(response.encoding or "utf-8", errors="replace")
        except (requests.exceptions.RequestException, ConnectionError) as exc:
            if _is_permanent_error(exc):
                logger.warning("Erro HTTP permanente pra %s: %s", url, exc)
                raise
            last_exception = exc
            logger.warning(
                "Erro na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = BACKOFF_BASE ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)

    logger.error("Todas as %d tentativas falharam pra %s", max_retries, url)
    raise last_exception  # type: ignore[misc]


def post_form(
    url: str,
    data: dict,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
) -> str:
    """Faz POST com form data e retorna resposta como texto.

    Args:
        url: URL de destino.
        data: Dicionário com dados do formulário.
        timeout: Timeout em segundos.
        max_retries: Número máximo de tentativas.

    Returns:
        Conteúdo da resposta como string.

    Raises:
        requests.exceptions.RequestException: Após esgotar tentativas.
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("POST tentativa %d/%d pra %s", attempt, max_retries, url)
            response = requests.post(url, data=data, timeout=timeout)
            response.raise_for_status()
            return response.text
        except (requests.exceptions.RequestException, ConnectionError) as exc:
            if _is_permanent_error(exc):
                logger.warning("Erro HTTP permanente pra %s: %s", url, exc)
                raise
            last_exception = exc
            logger.warning(
                "Erro na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = BACKOFF_BASE ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)

    logger.error("Todas as %d tentativas falharam pra %s", max_retries, url)
    raise last_exception  # type: ignore[misc]


def fetch_bytes(
    url: str,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
    headers: dict | None = None,
) -> bytes:
    """Faz GET e retorna resposta como bytes.

    Usa streaming pra suportar respostas grandes sem
    erro de conexão interrompida.

    Args:
        url: URL de destino.
        timeout: Timeout em segundos.
        max_retries: Número máximo de tentativas.
        headers: Headers HTTP customizados.

    Returns:
        Conteúdo da resposta como bytes.

    Raises:
        requests.exceptions.RequestException: Após esgotar tentativas.
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Tentativa %d/%d pra %s", attempt, max_retries, url)
            response = requests.get(
                url, stream=True, timeout=timeout, headers=headers or {}
            )
            response.raise_for_status()
            chunks = []
            for chunk in response.iter_content(chunk_size=65536):
                chunks.append(chunk)
            return b"".join(chunks)
        except (requests.exceptions.RequestException, ConnectionError) as exc:
            if _is_permanent_error(exc):
                logger.warning("Erro HTTP permanente pra %s: %s", url, exc)
                raise
            last_exception = exc
            logger.warning(
                "Erro na tentativa %d/%d pra %s: %s",
                attempt,
                max_retries,
                url,
                str(exc),
            )
            if attempt < max_retries:
                wait = BACKOFF_BASE ** attempt
                logger.info("Aguardando %ds antes da próxima tentativa...", wait)
                time.sleep(wait)

    logger.error("Todas as %d tentativas falharam pra %s", max_retries, url)
    raise last_exception  # type: ignore[misc]


def download_file(
    url: str,
    dest: str,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = MAX_RETRIES,
) -> str:
    """Baixa arquivo e salva no destino indicado.

    Args:
        url: URL do arquivo pra download.
        dest: Caminho de destino no sistema de arquivos.
        timeout: Timeout em segundos.
        max_retries: Número máximo de tentativas.

    Returns:
        Caminho absoluto do arquivo salvo.

    Raises:
        requests.exceptions.RequestException: Após esgotar tentativas.
    """
    response = _request_with_retry(
        "GET", url, timeout=timeout, max_retries=max_retries
    )
    dest_path = Path(dest)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(response.content)
    logger.info("Arquivo salvo em %s", dest_path)
    return str(dest_path.resolve())
