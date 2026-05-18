from openai import AsyncOpenAI
from app.config import get_settings

_settings = get_settings()

client = AsyncOpenAI(
    api_key="EMPTY",
    base_url=_settings.VLLM_BASE_URL,
)


async def chat_completion(
    messages: list[dict],
    max_tokens: int = 512,
    temperature: float = 0.8,
    thinking_mode: bool = True,
) -> str:
    """Send messages to vLLM and return the generated text."""
    kwargs: dict = {
        "model": _settings.VLLM_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "extra_body": {"chat_template_kwargs": {"enable_thinking": thinking_mode}},
    }
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def summarize_text(text: str, max_tokens: int = 256) -> str:
    """Summarize text for long-term memory compression."""
    messages = [
        {
            "role": "system",
            "content": "Summarize the following conversation history concisely, preserving key facts, events, and relationship dynamics.",
        },
        {"role": "user", "content": text},
    ]
    return await chat_completion(messages, max_tokens=max_tokens, temperature=0.3)
