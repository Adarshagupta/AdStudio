export async function createPresignedUploadUrl(key: string) {
  if (!process.env.R2_BUCKET || !process.env.R2_ACCOUNT_ID) {
    throw new Error("Cloudflare R2 is not configured. Set R2_ACCOUNT_ID and R2_BUCKET.");
  }

  return {
    key,
    uploadUrl: `/api/r2-upload/${encodeURIComponent(key)}`,
    publicUrl: `${process.env.R2_PUBLIC_BASE_URL}/${key}`,
  };
}
