export type DashboardOutputType = "video" | "image";

export function validateDashboardPrompt(prompt: string, hasReferenceImage: boolean) {
  const trimmed = prompt.trim();

  if (trimmed.length >= 3) {
    return { ok: true as const, prompt: trimmed };
  }

  if (hasReferenceImage) {
    return {
      ok: true as const,
      prompt: trimmed || "Create a short ad based on the reference image.",
    };
  }

  return {
    ok: false as const,
    message: "Describe what you want in a few words, or upload a reference image.",
  };
}

export function buildDashboardImagePrompt(
  prompt: string,
  referenceImageUrl?: string,
  productContext?: string,
) {
  const trimmed = prompt.trim();
  const productBlock = productContext?.trim()
    ? `Product and brand context:\n${productContext.trim()}`
    : "";

  if (!referenceImageUrl) {
    return [
      trimmed || "Marketing product image, clean composition, ad-ready.",
      productBlock,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    "Create a marketing still image inspired by the reference image.",
    "Preserve the subject, product, and overall visual style from the reference.",
    trimmed ? `Creative direction: ${trimmed}` : "Polished ad-ready composition with clear focal point.",
    productBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function enrichPromptWithProductContext(prompt: string, productContext?: string) {
  const trimmed = prompt.trim();
  if (!productContext?.trim()) return trimmed;
  return `${trimmed}\n\nProduct context:\n${productContext.trim()}`;
}

export function getGenerationOutputType(style: unknown): DashboardOutputType {
  if (style && typeof style === "object" && !Array.isArray(style)) {
    const outputType = (style as { outputType?: string }).outputType;
    if (outputType === "image") return "image";
  }
  return "video";
}
