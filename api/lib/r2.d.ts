export declare function isR2Configured(): boolean;
export declare function uploadBase64Image(base64: string, key: string): Promise<string>;
export declare function uploadImageFromUrl(imageUrl: string, key: string): Promise<string>;
export declare function getSignedImageUrl(key: string): Promise<string>;
/**
 * Rewrite a private R2 S3 endpoint URL to the public domain URL.
 * This fixes avatars/images created before R2_PUBLIC_DOMAIN was set.
 */
export declare function getPublicUrl(url: string | null): string | null;
