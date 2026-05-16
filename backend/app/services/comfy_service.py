import asyncio
import aiohttp
import shutil
import os
import urllib.parse
from app.config import get_settings
from app.services.vllm_service import chat_completion

_settings = get_settings()
_COMFY_URL = _settings.COMFYUI_URL

# ---------------------------------------------------------------------------
# Workflow templates (ComfyUI API format)
# ---------------------------------------------------------------------------

_CHARGEN_WORKFLOW = {
    "14": {"inputs": {"unet_name": "z_image_turbo_nvfp4.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
    "15": {"inputs": {"clip_name": "qwen_3_4b_fp4_mixed.safetensors", "type": "lumina2", "device": "default"}, "class_type": "CLIPLoader"},
    "8": {"inputs": {"vae_name": "ae.safetensors"}, "class_type": "VAELoader"},
    "9": {"inputs": {"model": ["14", 0], "shift": 3}, "class_type": "ModelSamplingAuraFlow"},
    "13": {"inputs": {"width": 1088, "height": 1920, "batch_size": 1}, "class_type": "EmptySD3LatentImage"},
    "11": {"inputs": {"text": "{prompt}", "clip": ["15", 0]}, "class_type": "CLIPTextEncode"},
    "12": {"inputs": {"text": "blurry ugly bad", "clip": ["15", 0]}, "class_type": "CLIPTextEncode"},
    "10": {"inputs": {"model": ["9", 0], "seed": 52980332419998, "steps": 9, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0, "positive": ["11", 0], "negative": ["12", 0], "latent_image": ["13", 0]}, "class_type": "KSampler"},
    "5": {"inputs": {"samples": ["10", 0], "vae": ["8", 0]}, "class_type": "VAEDecode"},
    "6": {"inputs": {"filename_prefix": "avatar", "images": ["5", 0]}, "class_type": "SaveImage"},
}

_CHAREDIT_WORKFLOW = {
    "9": {"inputs": {"unet_name": "qwen_image_edit_2511_fp8mixed.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
    "4": {"inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}, "class_type": "CLIPLoader"},
    "7": {"inputs": {"vae_name": "qwen_image_vae.safetensors"}, "class_type": "VAELoader"},
    "1": {"inputs": {"model": ["9", 0], "shift": 3.1}, "class_type": "ModelSamplingAuraFlow"},
    "5": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptySD3LatentImage"},
    "11": {"inputs": {"image": "{image_filename}", "upload": "image"}, "class_type": "LoadImage"},
    "12": {"inputs": {"text": "{prompt}", "clip": ["4", 0], "vae": ["7", 0], "image1": ["11", 0]}, "class_type": "TextEncodeQwenImageEditPlus"},
    "6": {"inputs": {"text": "blurry ugly bad", "clip": ["4", 0], "vae": ["7", 0], "image1": ["11", 0]}, "class_type": "TextEncodeQwenImageEditPlus"},
    "8": {"inputs": {"model": ["1", 0], "seed": 589836055062098, "steps": 20, "cfg": 4, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0, "positive": ["12", 0], "negative": ["6", 0], "latent_image": ["5", 0]}, "class_type": "KSampler"},
    "10": {"inputs": {"model": ["8", 0]}, "class_type": "CFGNorm"},
    "2": {"inputs": {"samples": ["10", 0], "vae": ["7", 0]}, "class_type": "VAEDecode"},
    "3": {"inputs": {"filename_prefix": "media", "images": ["2", 0]}, "class_type": "SaveImage"},
}


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


async def _generate_image_prompt(name: str, personality: str) -> str:
    """Use vLLM to turn character info into a detailed image-generation prompt."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert prompt engineer for AI image generation. "
                "Create a single, highly detailed, vivid image prompt based on the character description. "
                "Include subject, appearance, clothing, expression, background, lighting, and artistic style. "
                "Return ONLY the image prompt text—no extra commentary, no quotes around it."
            ),
        },
        {
            "role": "user",
            "content": f"Character name: {name}\nPersonality / traits: {personality}",
        },
    ]
    prompt = await chat_completion(messages, max_tokens=256, temperature=0.7)
    return prompt.strip().strip('"').strip("'")


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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_avatar(name: str, personality: str) -> str | None:
    """Generate a character avatar using the chargen workflow + vLLM prompt."""
    prompt = await _generate_image_prompt(name, personality)
    if not prompt:
        return None

    workflow = {k: v.copy() for k, v in _CHARGEN_WORKFLOW.items()}
    workflow["11"]["inputs"]["text"] = prompt

    # Randomise seed so each avatar is unique
    import random
    workflow["10"]["inputs"]["seed"] = random.randint(1, 2**32)

    return await _run_workflow_http(workflow, "avatar")


async def generate_media(
    media_type: str,
    description: str,
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

        workflow = {k: v.copy() for k, v in _CHAREDIT_WORKFLOW.items()}
        workflow["11"]["inputs"]["image"] = image_filename
        workflow["12"]["inputs"]["text"] = description

        # Randomise seed
        import random
        workflow["8"]["inputs"]["seed"] = random.randint(1, 2**32)

        return await _run_workflow_http(workflow, "media")

    # --- chargen: generic image from scratch ---
    workflow = {k: v.copy() for k, v in _CHARGEN_WORKFLOW.items()}
    workflow["11"]["inputs"]["text"] = description
    workflow["6"]["inputs"]["filename_prefix"] = "media"

    import random
    workflow["10"]["inputs"]["seed"] = random.randint(1, 2**32)

    return await _run_workflow_http(workflow, "media")
