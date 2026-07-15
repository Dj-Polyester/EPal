import { fal } from '@fal-ai/client';

function getFalKey(): string {
  const key = process.env.FAL_KEY || '';
  if (!key) {
    throw new Error('FAL_KEY environment variable is not set');
  }
  return key;
}

function configureFal() {
  const key = getFalKey();
  fal.config({ credentials: key });
}

export async function generateAvatar(prompt: string): Promise<string> {
  configureFal();

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: `Portrait avatar of a fictional character. ${prompt}`,
      image_size: 'square',
      num_inference_steps: 4,
    },
    pollInterval: 500,
    logs: true,
  });

  console.log('[Fal.AI] Avatar result:', JSON.stringify(result.data, null, 2));

  const data = result.data as { images?: Array<{ url: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error('Fal.AI avatar generation returned no image URL');
  return url;
}

export async function generateImageFromPrompt(
  prompt: string,
  imageUrl: string
): Promise<string> {
  configureFal();

  console.log('[Fal.AI] Calling fal-ai/flux-2/klein/9b/edit with:');
  console.log('  prompt:', prompt);
  console.log('  image_url:', imageUrl);

  try {
    const result = await fal.subscribe('fal-ai/flux-2/klein/9b/edit', {
      input: {
        image_urls: [imageUrl],
        prompt,
      },
      pollInterval: 500,
      logs: true,
    });

    console.log('[Fal.AI] Edit result:', JSON.stringify(result.data, null, 2));

    const data = result.data as { images?: Array<{ url: string }> };
    const url = data.images?.[0]?.url;
    if (!url) throw new Error('Fal.AI image generation returned no image URL');
    return url;
  } catch (err: any) {
    console.error('[Fal.AI] Edit request failed:', err.status, err.message);
    if (err.status === 422) {
      console.error('[Fal.AI] 422 Unprocessable Entity. The model may not accept the provided parameters, or the image_url is not publicly accessible.');
    }
    throw err;
  }
}
