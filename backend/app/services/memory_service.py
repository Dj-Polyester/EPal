import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models import Chat, Message
from app.services.vllm_service import summarize_text

SUMMARY_THRESHOLD = 40  # Summarize when message count exceeds this
CONTEXT_WINDOW = 20     # Number of recent messages to keep verbatim


async def build_chat_context(
    db: AsyncSession,
    chat: Chat,
    character_personality: str,
    user_bio: str | None,
    new_user_message: str,
) -> list[dict]:
    """Build the message list for vLLM including system prompt, memory, and recent history."""

    # System prompt with personality and user context
    system_parts = [
        f"You are a virtual character with the following personality and traits: {character_personality}",
        "Stay in character at all times. Reflect your personality in your tone, word choice, and reactions.",
        "You have memory of past conversations and remember details about yourself and the user.",
        "",
        "You CAN generate ONE image when the user explicitly asks for it.",
        "",
        "When the user EXPLICITLY asks for a photo, selfie, picture, or image:",
        "  1. Respond naturally in character",
        "  2. Add EXACTLY ONE tag on a NEW LINE: [GENERATE_IMAGE:a vivid detailed description]",
        "  3. Send ONLY ONE image. Do NOT send multiple images.",
        "",
        "When the user EXPLICITLY asks for video or animation:",
        "  1. Respond naturally in character",
        "  2. Add EXACTLY ONE tag: [GENERATE_VIDEO:a vivid detailed description]",
        "",
        "When the user EXPLICITLY asks for voice or audio:",
        "  1. Respond naturally in character",
        "  2. Add EXACTLY ONE tag: [GENERATE_AUDIO:a vivid detailed description]",
        "",
        "EXAMPLES:",
        "  User: 'Send me a pic of you at the beach'",
        "  You: 'Here I am enjoying the sunset!' [GENERATE_IMAGE:a young woman with long brown hair wearing a sundress sitting on a tropical beach at sunset, golden hour lighting]",
        "",
        "  User: 'Can I see 3 photos of you?'",
        "  You: 'Here is one photo of me!' [GENERATE_IMAGE:a young woman smiling at the camera, soft natural lighting, casual outfit] (ONLY ONE — not three)",
        "",
        "  User: 'hi'",
        "  You: 'Hello! How are you today?'  (NO image tag — the user did not ask for an image)",
        "",
        "  User: 'What is your favorite color?'",
        "  You: 'I love deep purple, like the night sky!'  (NO image tag)",
        "",
        "RULES:",
        "  1. ONLY use [GENERATE_...] tags when the user EXPLICITLY asks for media.",
        "  2. For normal chat, greetings, questions, or conversation — NEVER use the tag.",
        "  3. Use the EXACT format [GENERATE_IMAGE:description] — do NOT change it.",
        "  4. NEVER write 'Here is an image of...' in plain text.",
        "  5. NEVER output ComfyUI URLs or image links.",
        "  6. ALWAYS send exactly ONE image. Never more than one.",
    ]
    if user_bio:
        system_parts.append(f"Information about the user you are chatting with: {user_bio}")

    # Fetch recent messages
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(desc(Message.created_at))
        .limit(100)
    )
    all_messages = list(reversed(result.scalars().all()))

    # Manage long-term memory via summarization
    if len(all_messages) > SUMMARY_THRESHOLD:
        # Summarize older messages (everything outside the context window)
        older = all_messages[:-CONTEXT_WINDOW]
        text_to_summarize = "\n".join([f"{m.role}: {m.content}" for m in older])
        if chat.summary:
            # Include previous summary as context for incremental summarization
            text_to_summarize = f"Previous summary: {chat.summary}\n\nNewer messages:\n{text_to_summarize}"
        summary = await summarize_text(text_to_summarize)
        chat.summary = summary
        await db.commit()

    messages: list[dict] = [{"role": "system", "content": " ".join(system_parts)}]

    # Add summary if exists
    if chat.summary:
        messages.append({
            "role": "system",
            "content": f"Summary of past conversations: {chat.summary}",
        })

    # Add recent messages
    recent = all_messages[-CONTEXT_WINDOW:] if len(all_messages) > CONTEXT_WINDOW else all_messages
    for m in recent:
        messages.append({"role": m.role, "content": m.content})

    # Add new user message
    messages.append({"role": "user", "content": new_user_message})

    return messages


MEDIA_TAG_PATTERN = re.compile(
    r"\[(GENERATE_IMAGE|GENERATE_VIDEO|GENERATE_AUDIO):([^\]]+)\]"
)


def extract_media_requests(text: str) -> list[tuple[str, str]]:
    """Extract media generation tags from assistant response.
    Returns list of (media_type, description)."""
    matches = MEDIA_TAG_PATTERN.findall(text)
    return [(m[0].replace("GENERATE_", "").lower(), m[1].strip()) for m in matches]


def replace_media_tags(
    text: str,
    replacements: list[tuple[str, str | None]],
    proxy_base: str | None = None,
) -> str:
    """Replace media tags with either a URL or a 'not available' message.

    If proxy_base is provided, ComfyUI image URLs are rewritten through it
    so the frontend can load them same-origin.
    Unmatched tags are stripped silently (only the first tag is processed).
    """
    def replacer(match):
        media_type = match.group(1).replace("GENERATE_", "").lower()
        desc = match.group(2).strip()
        for mt, url in replacements:
            if mt == media_type:
                if url:
                    if proxy_base and url.startswith("http://"):
                        url = f"{proxy_base}/media/proxy?url={url}"
                    return f"[Here is the {media_type}: {url}]"
                else:
                    return f"[I cannot generate {media_type} right now, but I can describe it for you!]"
        # Unmatched tag — strip it silently
        return ""
    return MEDIA_TAG_PATTERN.sub(replacer, text)
