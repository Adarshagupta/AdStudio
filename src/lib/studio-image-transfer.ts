export const STUDIO_IMAGE_URL_KEY = "studio-image-url";

export function setStudioImageUrl(url: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STUDIO_IMAGE_URL_KEY, url);
}

export function consumeStudioImageUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(STUDIO_IMAGE_URL_KEY);
  if (url) sessionStorage.removeItem(STUDIO_IMAGE_URL_KEY);
  return url;
}
