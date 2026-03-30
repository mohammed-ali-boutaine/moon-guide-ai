"""
services/llm_service.py

Unified LLM generation layer.

Dispatches to Gemini, Mistral (cloud), or Ollama (local) based on
settings.LLM_PROVIDER ("gemini" | "mistral" | "ollama").
All services (RAG, quiz, grading) import call_llm() from here instead of
talking to a provider SDK directly.

Returns: (text, prompt_tokens, completion_tokens, total_tokens)
"""
from __future__ import annotations

import time

from app.core.config import settings
from app.core.logging import logger


def _resolve_gemini_model() -> str:
    """Return a supported Gemini model name, normalizing deprecated aliases."""
    configured = (settings.GEMINI_MODEL or "").strip()
    normalized = configured.removeprefix("models/")
    deprecated = {"gemini-2.0-flash"}
    if normalized in deprecated:
        fallback = "gemini-2.5-flash"
        logger.warning(
            "LLM[gemini] configured model '%s' is deprecated; using '%s' instead.",
            configured,
            fallback,
        )
        return fallback
    return normalized or "gemini-2.5-flash"


def call_llm(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> tuple[str, int, int, int]:
    """
    Call the configured LLM provider and return
    (answer_text, prompt_tokens, completion_tokens, total_tokens).

    Provider is selected via LLM_PROVIDER setting: 'gemini' | 'mistral'.
    json_mode=True forces structured JSON output (Gemini: response_mime_type).
    """
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini":
        try:
            return _call_gemini(prompt, temperature, max_tokens, json_mode=json_mode)
        except RuntimeError as exc:
            msg = str(exc)
            is_rate_limited = (
                "429" in msg or "RESOURCE_EXHAUSTED" in msg or "rate limit" in msg.lower()
            )
            if is_rate_limited:
                if settings.MISTRAL_API_KEY:
                    logger.warning(
                        "LLM[gemini] rate-limit exhausted, falling back to mistral. Reason: %s", exc
                    )
                    try:
                        return _call_mistral(prompt, temperature, max_tokens, json_mode=json_mode)
                    except RuntimeError as mistral_exc:
                        if settings.OLLAMA_FALLBACK_ENABLED:
                            logger.warning(
                                "LLM[mistral] also failed, falling back to ollama. Reason: %s",
                                mistral_exc,
                            )
                            return _call_ollama(prompt, temperature, max_tokens, json_mode=json_mode)
                        raise
                elif settings.OLLAMA_FALLBACK_ENABLED:
                    logger.warning(
                        "LLM[gemini] rate-limit exhausted, no Mistral key, falling back to ollama. Reason: %s",
                        exc,
                    )
                    return _call_ollama(prompt, temperature, max_tokens, json_mode=json_mode)
            raise
    elif provider == "mistral":
        try:
            return _call_mistral(prompt, temperature, max_tokens, json_mode=json_mode)
        except RuntimeError as exc:
            if settings.OLLAMA_FALLBACK_ENABLED:
                logger.warning(
                    "LLM[mistral] failed, falling back to ollama. Reason: %s", exc
                )
                return _call_ollama(prompt, temperature, max_tokens, json_mode=json_mode)
            raise
    elif provider == "ollama":
        return _call_ollama(prompt, temperature, max_tokens, json_mode=json_mode)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER: {provider!r}. Valid values: 'gemini', 'mistral', 'ollama'."
        )


def current_model_name() -> str:
    """Return the model identifier string for the active provider (for logging/DB)."""
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini":
        return _resolve_gemini_model()
    if provider == "ollama":
        return settings.OLLAMA_MODEL
    return settings.MISTRAL_CHAT_MODEL


# ── Gemini backend ────────────────────────────────────────────────────────────

def _call_gemini(
    prompt: str, temperature: float, max_tokens: int, json_mode: bool = False
) -> tuple[str, int, int, int]:
    from google import genai
    from google.genai import types as genai_types
    from google.genai import errors as genai_errors

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    model_name = _resolve_gemini_model()
    delay = settings.LLM_RETRY_DELAY
    last_exc: Exception | None = None

    gen_config_kwargs: dict = {
        "max_output_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        gen_config_kwargs["response_mime_type"] = "application/json"

    for attempt in range(1, settings.GEMINI_MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(**gen_config_kwargs),
            )
            text = response.text or ""
            usage = getattr(response, "usage_metadata", None)
            pt = getattr(usage, "prompt_token_count", 0) or 0
            ct = getattr(usage, "candidates_token_count", 0) or 0
            tt = getattr(usage, "total_token_count", 0) or (pt + ct)
            logger.info("LLM[gemini] ok: attempt=%d tokens(p=%d c=%d t=%d)", attempt, pt, ct, tt)
            return text, pt, ct, tt
        except genai_errors.ClientError as exc:
            if getattr(exc, "status_code", None) == 429:
                logger.warning("LLM[gemini] rate limit (attempt %d): %s", attempt, exc)
                last_exc = exc
            else:
                raise RuntimeError(f"Gemini API error: {exc}") from exc
        except genai_errors.ServerError as exc:
            logger.warning("LLM[gemini] server error (attempt %d): %s", attempt, exc)
            last_exc = exc
        except Exception as exc:
            logger.warning("LLM[gemini] error (attempt %d): %s", attempt, exc)
            last_exc = exc

        if attempt < settings.GEMINI_MAX_RETRIES:
            time.sleep(delay)
            delay *= 2

    raise RuntimeError(
        f"Gemini failed after {settings.GEMINI_MAX_RETRIES} attempts. Last: {last_exc}"
    )


# ── Mistral backend ───────────────────────────────────────────────────────────

def _call_mistral(
    prompt: str, temperature: float, max_tokens: int, json_mode: bool = False
) -> tuple[str, int, int, int]:
    from mistralai.client import Mistral

    if not settings.MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY is not configured.")

    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    delay = settings.LLM_RETRY_DELAY
    last_exc: Exception | None = None

    call_kwargs: dict = {
        "model": settings.MISTRAL_CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        call_kwargs["response_format"] = {"type": "json_object"}

    for attempt in range(1, settings.GEMINI_MAX_RETRIES + 1):
        try:
            response = client.chat.complete(**call_kwargs)
            text = response.choices[0].message.content or ""
            usage = response.usage
            pt = getattr(usage, "prompt_tokens", 0) or 0
            ct = getattr(usage, "completion_tokens", 0) or 0
            tt = getattr(usage, "total_tokens", 0) or (pt + ct)
            logger.info("LLM[mistral] ok: attempt=%d tokens(p=%d c=%d t=%d)", attempt, pt, ct, tt)
            return text, pt, ct, tt
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if status == 429:
                logger.warning("LLM[mistral] rate limit (attempt %d): %s", attempt, exc)
                last_exc = exc
            elif status and status >= 500:
                logger.warning("LLM[mistral] server error (attempt %d): %s", attempt, exc)
                last_exc = exc
            else:
                raise RuntimeError(f"Mistral API error: {exc}") from exc

        if attempt < settings.GEMINI_MAX_RETRIES:
            time.sleep(delay)
            delay *= 2

    raise RuntimeError(
        f"Mistral failed after {settings.GEMINI_MAX_RETRIES} attempts. Last: {last_exc}"
    )


# ── Ollama backend (local) ────────────────────────────────────────────────────

def _call_ollama(
    prompt: str, temperature: float, max_tokens: int, json_mode: bool = False
) -> tuple[str, int, int, int]:
    """
    Call a locally running Ollama server (e.g. Mistral 7B v0.3).

    Requires Ollama running at settings.OLLAMA_BASE_URL with
    settings.OLLAMA_MODEL pulled (`ollama pull mistral:7b-v0.3`).
    json_mode=True forces structured JSON output via Ollama's format field.
    """
    import ollama as _ollama
    from ollama import Client, ResponseError

    client = Client(host=settings.OLLAMA_BASE_URL)
    delay = settings.LLM_RETRY_DELAY
    last_exc: Exception | None = None

    chat_kwargs: dict = {
        "model": settings.OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if json_mode:
        chat_kwargs["format"] = "json"

    max_retries = settings.GEMINI_MAX_RETRIES  # reuse the shared retry count

    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat(**chat_kwargs)
            text = response.message.content or ""
            pt = getattr(response, "prompt_eval_count", 0) or 0
            ct = getattr(response, "eval_count", 0) or 0
            tt = pt + ct
            logger.info(
                "LLM[ollama/%s] ok: attempt=%d tokens(p=%d c=%d t=%d)",
                settings.OLLAMA_MODEL, attempt, pt, ct, tt,
            )
            return text, pt, ct, tt
        except ResponseError as exc:
            logger.warning("LLM[ollama] error (attempt %d): %s", attempt, exc)
            last_exc = exc
        except Exception as exc:
            logger.warning("LLM[ollama] unexpected error (attempt %d): %s", attempt, exc)
            last_exc = exc

        if attempt < max_retries:
            time.sleep(delay)
            delay *= 2

    raise RuntimeError(
        f"Ollama ({settings.OLLAMA_MODEL}) failed after {max_retries} attempts. Last: {last_exc}"
    )
