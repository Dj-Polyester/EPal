import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || '';
const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || '';
function getS3Client() {
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
        return null;
    }
    return new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
        },
    });
}
export function isR2Configured() {
    return !!(r2AccountId &&
        r2AccessKeyId &&
        r2SecretAccessKey &&
        r2BucketName);
}
export async function uploadBase64Image(base64, key) {
    const s3 = getS3Client();
    if (!s3) {
        throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.');
    }
    // Extract content type from data URI if present
    const match = base64.match(/^data:(.+);base64,/);
    let contentType = 'image/png';
    let rawBase64 = base64;
    if (match) {
        contentType = match[1];
        rawBase64 = base64.slice(match[0].length);
    }
    const buffer = Buffer.from(rawBase64, 'base64');
    await s3.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    if (r2PublicDomain) {
        return `${r2PublicDomain}/${key}`;
    }
    return `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${key}`;
}
export async function uploadImageFromUrl(imageUrl, key) {
    const s3 = getS3Client();
    if (!s3) {
        throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.');
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';
    await s3.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    // Return public URL
    if (r2PublicDomain) {
        return `${r2PublicDomain}/${key}`;
    }
    return `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${key}`;
}
export async function getSignedImageUrl(key) {
    const s3 = getS3Client();
    if (!s3) {
        throw new Error('R2 is not configured');
    }
    const command = new GetObjectCommand({
        Bucket: r2BucketName,
        Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn: 3600 });
}
/**
 * Rewrite a private R2 S3 endpoint URL to the public domain URL.
 * This fixes avatars/images created before R2_PUBLIC_DOMAIN was set.
 */
export function getPublicUrl(url) {
    if (!url || !r2PublicDomain)
        return url;
    // If already using public domain, return as-is
    if (url.startsWith(r2PublicDomain))
        return url;
    // Extract the object key from the private S3 URL
    // Format: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
    const privatePrefix = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/`;
    if (url.startsWith(privatePrefix)) {
        const key = url.slice(privatePrefix.length);
        return `${r2PublicDomain}/${key}`;
    }
    return url;
}
