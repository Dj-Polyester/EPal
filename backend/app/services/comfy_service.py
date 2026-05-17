import asyncio
import aiohttp
import shutil
import os
import urllib.parse
import json
import random
from pathlib import Path
from app.config import get_settings
from app.services.vllm_service import chat_completion

_settings = get_settings()
_COMFY_URL = _settings.COMFYUI_URL

CHARGEN_WORKFLOW_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "comfyui" / "workflows" / "flux2_chargen.json"
)
CHAREDIT_WORKFLOW_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "comfyui" / "workflows" / "flux2_charedit.json"
)

# Node types that have hidden widgets not reflected in the inputs list.
# Maps node type -> ordered list of ALL widget names (including hidden ones)
# so we can index widgets_values correctly.
_NODE_WIDGET_NAMES = {
    "KSampler": ["seed", "control_after_generate", "steps", "cfg", "sampler_name", "scheduler", "denoise"],
    "UnetLoaderGGUF": ["unet_name", "weight_dtype"],
    "CLIPLoaderGGUF": ["clip_name", "type", "device"],
    "VAELoader": ["vae_name"],
    "CLIPTextEncode": ["text"],
    "EmptyFlux2LatentImage": ["width", "height", "batch_size"],
    "EmptySD3LatentImage": ["width", "height", "batch_size"],
    "SaveImage": ["filename_prefix"],
    "LoadImage": ["image", "upload"],
    "VAEDecode": [],
    # custom node with no widgets
    "f23a0cc7-4042-4914-9828-d09ab4e8b07f": [],
}


OLLAMA_NODE_TYPES = {"OllamaConnectivityV2", "OllamaGenerateV2", "OllamaConnectivity", "OllamaGenerate", "PreviewAny"}


def _get_widget_value(node: dict, input_name: str):
    """Extract the correct widgets_values entry for a widget input, accounting for hidden widgets."""
    node_type = node.get("type", "")
    widgets_values = node.get("widgets_values", [])

    widget_names = _NODE_WIDGET_NAMES.get(node_type)
    if widget_names:
        try:
            idx = widget_names.index(input_name)
            if idx < len(widgets_values):
                return widgets_values[idx]
        except ValueError:
            pass

    # Fallback: count widget inputs seen so far in the inputs list
    widget_inputs = [inp for inp in node.get("inputs", []) if "widget" in inp]
    for i, inp in enumerate(widget_inputs):
        if inp["name"] == input_name and i < len(widgets_values):
            return widgets_values[i]

    return None


def _workflow_to_prompt(workflow_data: dict, *, remove_ollama: bool = False) -> dict:
    """Convert a ComfyUI workflow export (nodes/links format) to prompt API format."""
    nodes = {n["id"]: n for n in workflow_data.get("nodes", [])}
    links_by_id = {link[0]: link for link in workflow_data.get("links", [])}

    prompt = {}
    removed_ids = set()

    if remove_ollama:
        for nid, node in nodes.items():
            if node.get("type") in OLLAMA_NODE_TYPES:
                removed_ids.add(nid)

    for nid, node in nodes.items():
        if nid in removed_ids:
            continue

        class_type = node.get("type", "")
        inputs = {}

        for inp in node.get("inputs", []):
            input_name = inp["name"]
            link_id = inp.get("link")

            if link_id is not None:
                link = links_by_id.get(link_id)
                if link is not None:
                    origin_node = link[1]
                    if origin_node in removed_ids:
                        # Connection to removed Ollama node -> set placeholder
                        inputs[input_name] = ""
                        continue
                    origin_slot = link[2]
                    inputs[input_name] = [str(origin_node), origin_slot]
            elif "widget" in inp:
                value = _get_widget_value(node, input_name)
                if value is not None:
                    inputs[input_name] = value

        prompt[str(nid)] = {
            "inputs": inputs,
            "class_type": class_type,
        }

    return prompt


async def _load_workflow_prompt(workflow_path: Path, *, remove_ollama: bool = False) -> dict:
    """Load a ComfyUI workflow JSON and convert it to prompt API format."""
    text = await asyncio.to_thread(workflow_path.read_text)
    workflow_data = json.loads(text)
    return _workflow_to_prompt(workflow_data, remove_ollama=remove_ollama)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _run_workflow_http(workflow: dict, prefix: str, timeout: int = 180) -> str | None:
    """Submit workflow via ComfyUI HTTP API and poll for result."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(f"{_COMFY_URL}/prompt", json={"prompt": workflow}) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    print(f"[ComfyUI] prompt submit failed: {resp.status} {body}")
                    return None
                data = await resp.json()
                prompt_id = data.get("prompt_id")
                if not prompt_id:
                    return None

            for _ in range(timeout):
                await asyncio.sleep(1)
                async with session.get(f"{_COMFY_URL}/history/{prompt_id}") as resp:
                    if resp.status == 200:
                        history = await resp.json()
                        if prompt_id in history:
                            outputs = history[prompt_id].get("outputs", {})
                            for node_id, node_output in outputs.items():
                                if "images" in node_output:
                                    image = node_output["images"][0]
                                    filename = image["filename"]
                                    subfolder = image.get("subfolder", "")
                                    return f"{_COMFY_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
                            break
            return None
        except Exception as e:
            print(f"[ComfyUI] workflow error: {e}")
            return None


async def _ensure_image_in_input(image_url: str) -> str | None:
    """Download/copy an image into ComfyUI's input folder and return its filename."""
    # Parse filename from URL query param
    parsed = urllib.parse.urlparse(image_url)
    qs = urllib.parse.parse_qs(parsed.query)
    filename = qs.get("filename", [None])[0]
    if not filename:
        # Try to extract from path
        filename = os.path.basename(parsed.path) or "source.png"

    input_dir = os.path.join(os.path.dirname(__file__), "../../../comfyui/input")
    input_dir = os.path.abspath(input_dir)
    os.makedirs(input_dir, exist_ok=True)
    dest_path = os.path.join(input_dir, filename)

    # If already present, just return the name
    if os.path.exists(dest_path):
        return filename

    # Try local copy from output folder first (bind-mounted)
    output_dir = os.path.join(os.path.dirname(__file__), "../../../comfyui/output")
    output_dir = os.path.abspath(output_dir)
    local_src = os.path.join(output_dir, filename)
    if os.path.exists(local_src):
        shutil.copy2(local_src, dest_path)
        return filename

    # Otherwise download via HTTP
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    with open(dest_path, "wb") as f:
                        f.write(await resp.read())
                    return filename
    except Exception as e:
        print(f"[ComfyUI] failed to download image {image_url}: {e}")

    return None


async def _generate_media_image_prompt(chat_context: list[dict], description: str) -> str:
    """Use vLLM to generate a detailed image-generation prompt based on chat context."""
    context_parts = []
    for msg in chat_context:
        if msg["role"] == "system":
            context_parts.append(msg["content"])
        elif msg["role"] in ("user", "assistant"):
            context_parts.append(f"{msg['role'].capitalize()}: {msg['content']}")

    context_text = "\n".join(context_parts)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert prompt engineer for AI image generation. "
                "Given the conversation context and a media request, create a single, highly detailed, vivid image prompt. "
                "Include subject, appearance, clothing, expression, background, lighting, and artistic style. "
                "Return ONLY the image prompt text—no extra commentary, no quotes around it."
            ),
        },
        {
            "role": "user",
            "content": f"Conversation context:\n{context_text}\n\nMedia request: {description}\n\nGenerate the image prompt:",
        },
    ]
    prompt = await chat_completion(messages, max_tokens=256, temperature=0.7)
    return prompt.strip().strip('"').strip("'")


def _inject_prompt_into_workflow(workflow: dict, prompt: str) -> None:
    """Inject a text prompt into the first CLIPTextEncode node that isn't the negative prompt."""
    for node in workflow.values():
        if node.get("class_type") == "CLIPTextEncode":
            inputs = node.get("inputs", {})
            if inputs.get("text") != "blurry ugly bad":
                inputs["text"] = prompt
                break


def _randomize_ksampler_seed(workflow: dict) -> None:
    """Randomize the seed in the first KSampler node."""
    for node in workflow.values():
        if node.get("class_type") == "KSampler":
            node["inputs"]["seed"] = random.randint(1, 2**32)
            break


def _set_filename_prefix(workflow: dict, prefix: str) -> None:
    """Set the filename prefix in the first SaveImage node."""
    for node in workflow.values():
        if node.get("class_type") == "SaveImage":
            node["inputs"]["filename_prefix"] = prefix
            break


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_avatar(personality_prompt: str) -> str | None:
    """Generate a character avatar using the chargen workflow with the user's personality prompt."""
    workflow = await _load_workflow_prompt(CHARGEN_WORKFLOW_PATH, remove_ollama=True)

    _inject_prompt_into_workflow(workflow, personality_prompt)
    _randomize_ksampler_seed(workflow)
    _set_filename_prefix(workflow, "avatar")

    return await _run_workflow_http(workflow, "avatar")


async def generate_media(
    media_type: str,
    prompt: str,
    source_image_url: str | None = None,
) -> str | None:
    """Generate media.

    * If ``source_image_url`` is given → use the **charedit** workflow
      (character sends a photo based on their avatar).
    * Otherwise → fall back to the **chargen** workflow for generic image generation.
    """
    if media_type != "image":
        # Video / audio stubs remain unimplemented for now
        return None

    if source_image_url:
        # --- charedit: edit existing character photo ---
        image_filename = await _ensure_image_in_input(source_image_url)
        if not image_filename:
            return None

        workflow = await _load_workflow_prompt(CHAREDIT_WORKFLOW_PATH)

        # Inject source image
        for node in workflow.values():
            if node.get("class_type") == "LoadImage":
                node["inputs"]["image"] = image_filename
                break

        _inject_prompt_into_workflow(workflow, prompt)
        _randomize_ksampler_seed(workflow)
        _set_filename_prefix(workflow, "media")

        return await _run_workflow_http(workflow, "media")

    # --- chargen: generic image from scratch ---
    workflow = await _load_workflow_prompt(CHARGEN_WORKFLOW_PATH, remove_ollama=True)

    _inject_prompt_into_workflow(workflow, prompt)
    _randomize_ksampler_seed(workflow)
    _set_filename_prefix(workflow, "media")

    return await _run_workflow_http(workflow, "media")
