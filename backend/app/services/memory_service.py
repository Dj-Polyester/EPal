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
        "If the user asks for an image, include [GENERATE_IMAGE:detailed description] in your response.",
        "If the user asks for a video, include [GENERATE_VIDEO:detailed description] in your response.",
        "If the user asks for audio, include [GENERATE_AUDIO:detailed description] in your response.",
        "If you cannot generate the requested media, say so politely and naturally.",
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


def replace_media_tags(text: str, replacements: list[tuple[str, str | None]]) -> str:
    """Replace media tags with either a URL or a 'not available' message."""
    def replacer(match):
        media_type = match.group(1).replace("GENERATE_", "").lower()
        desc = match.group(2).strip()
        for mt, url in replacements:
            if mt == media_type:
                if url:
                    return f"[Here is the {media_type} you requested: {url}]"
                else:
                    return f"[I don't currently have the ability to generate {media_type} content, but I can describe it for you!]"
        return match.group(0)
    return MEDIA_TAG_PATTERN.sub(replacer, text)
