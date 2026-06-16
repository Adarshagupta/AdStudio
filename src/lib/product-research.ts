import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ProductResearch = {
  url: string;
  brandName?: string;
  productName?: string;
  category?: string;
  tagline?: string;
  description?: string;
  keyFeatures?: string[];
  targetAudience?: string;
  priceOrOffer?: string;
  tone?: string;
  adAngles?: string[];
  summary: string;
};

const FETCH_TIMEOUT_MS = 15_000;
const AGENT_FETCH_TIMEOUT_MS = 8_000;
const DNS_TIMEOUT_MS = 5_000;
const OPENAI_TIMEOUT_MS = 45_000;
const AGENT_OPENAI_TIMEOUT_MS = 15_000;
const RESEARCH_TIMEOUT_MS = 60_000;
const AGENT_RESEARCH_TIMEOUT_MS = 25_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_TEXT_CHARS = 14_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is required for product research.");
  }
  return key;
}

function isPrivateIp(address: string) {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  if (address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) {
    return true;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export async function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid product URL (https://…).");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Product URL must use http or https.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Product URL cannot include credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("That URL is not allowed.");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("That URL is not allowed.");
    }
    return parsed.toString();
  }

  const records = await withTimeout(
    lookup(hostname, { all: true }),
    DNS_TIMEOUT_MS,
    "DNS lookup",
  );
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error("That URL is not allowed.");
  }

  return parsed.toString();
}

function htmlToText(html: string) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const text = withoutNoise
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_TEXT_CHARS);
}

async function fetchPageText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LiteMoovBot/1.0; +https://litemoov.com)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Could not fetch page (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const looksLikeHtml =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml") ||
      contentType === "";

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_HTML_BYTES) {
      throw new Error("Page is too large to analyze.");
    }

    const html = buffer.toString("utf8");
    if (!looksLikeHtml && !html.includes("<html") && !html.includes("<body")) {
      throw new Error("URL must point to a public web page.");
    }

    const text = htmlToText(html);
    if (text.length < 80) {
      throw new Error("Not enough readable content on that page.");
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function openaiExtractProductResearch(url: string, pageText: string) {
  const model = process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract marketing-ready product facts from website text for UGC ad generation. " +
              "Return strict JSON only. Do not invent details that are not supported by the page.",
          },
          {
            role: "user",
            content: [
              `URL: ${url}`,
              "Page text:",
              pageText,
              "",
              "Return JSON with keys:",
              "brandName, productName, category, tagline, description, keyFeatures (array), targetAudience, priceOrOffer, tone, adAngles (array), summary.",
              "summary must be 2-4 sentences usable as an ad brief.",
            ].join("\n"),
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? `OpenAI request failed (${response.status}).`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI did not return product research.");
    }

    const parsed = JSON.parse(content) as Partial<ProductResearch>;
    return {
      url,
      brandName: parsed.brandName?.trim() || undefined,
      productName: parsed.productName?.trim() || undefined,
      category: parsed.category?.trim() || undefined,
      tagline: parsed.tagline?.trim() || undefined,
      description: parsed.description?.trim() || undefined,
      keyFeatures: Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures.filter((item): item is string => typeof item === "string").slice(0, 8)
        : undefined,
      targetAudience: parsed.targetAudience?.trim() || undefined,
      priceOrOffer: parsed.priceOrOffer?.trim() || undefined,
      tone: parsed.tone?.trim() || undefined,
      adAngles: Array.isArray(parsed.adAngles)
        ? parsed.adAngles.filter((item): item is string => typeof item === "string").slice(0, 6)
        : undefined,
      summary:
        parsed.summary?.trim() ||
        [parsed.productName, parsed.description].filter(Boolean).join(" — ") ||
        `Product page at ${url}`,
    } satisfies ProductResearch;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI product research timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function formatProductResearchContext(research: ProductResearch) {
  const lines = [
    research.summary,
    research.brandName ? `Brand: ${research.brandName}` : "",
    research.productName ? `Product: ${research.productName}` : "",
    research.category ? `Category: ${research.category}` : "",
    research.tagline ? `Tagline: ${research.tagline}` : "",
    research.description ? `Description: ${research.description}` : "",
    research.targetAudience ? `Audience: ${research.targetAudience}` : "",
    research.priceOrOffer ? `Offer: ${research.priceOrOffer}` : "",
    research.tone ? `Tone: ${research.tone}` : "",
    research.keyFeatures?.length ? `Features: ${research.keyFeatures.join("; ")}` : "",
    research.adAngles?.length ? `Ad angles: ${research.adAngles.join("; ")}` : "",
    `Source URL: ${research.url}`,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function researchProductFromUrl(rawUrl: string) {
  return withTimeout(
    (async () => {
      const url = await assertPublicHttpUrl(rawUrl);
      const pageText = await fetchPageText(url);
      return openaiExtractProductResearch(url, pageText);
    })(),
    RESEARCH_TIMEOUT_MS,
    "Product research",
  );
}

export function fallbackProductContext(productUrl: string, reason?: string) {
  return [
    reason ? `Note: ${reason}` : "",
    `Product URL: ${productUrl.trim()}`,
    "Use the URL and user prompt to infer the product, brand, and offer for the ad.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function resolveProductContext(productUrl?: string | null) {
  const trimmed = productUrl?.trim();
  if (!trimmed) return undefined;

  const research = await researchProductFromUrl(trimmed);
  return formatProductResearchContext(research);
}

export async function resolveProductContextSafe(productUrl?: string | null) {
  const trimmed = productUrl?.trim();
  if (!trimmed) return undefined;

  try {
    return await resolveProductContext(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product research failed.";
    return fallbackProductContext(trimmed, message);
  }
}

async function openaiInferProductFromUrl(url: string) {
  const model = process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You infer likely product marketing facts from a product URL for UGC ad generation. " +
              "Use only what can be reasonably inferred from the URL path, domain, and brand. " +
              "Return strict JSON only. Mark uncertain details conservatively.",
          },
          {
            role: "user",
            content: [
              `URL: ${url}`,
              "",
              "Return JSON with keys:",
              "brandName, productName, category, tagline, description, keyFeatures (array), targetAudience, priceOrOffer, tone, adAngles (array), summary.",
              "summary must be 2-4 sentences usable as an ad brief.",
            ].join("\n"),
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? `OpenAI request failed (${response.status}).`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI did not return product research.");
    }

    const parsed = JSON.parse(content) as Partial<ProductResearch>;
    return {
      url,
      brandName: parsed.brandName?.trim() || undefined,
      productName: parsed.productName?.trim() || undefined,
      category: parsed.category?.trim() || undefined,
      tagline: parsed.tagline?.trim() || undefined,
      description: parsed.description?.trim() || undefined,
      keyFeatures: Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures.filter((item): item is string => typeof item === "string").slice(0, 8)
        : undefined,
      targetAudience: parsed.targetAudience?.trim() || undefined,
      priceOrOffer: parsed.priceOrOffer?.trim() || undefined,
      tone: parsed.tone?.trim() || undefined,
      adAngles: Array.isArray(parsed.adAngles)
        ? parsed.adAngles.filter((item): item is string => typeof item === "string").slice(0, 6)
        : undefined,
      summary:
        parsed.summary?.trim() ||
        [parsed.productName, parsed.description].filter(Boolean).join(" — ") ||
        `Product page at ${url}`,
    } satisfies ProductResearch;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI product research timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Fast path for agent generation — skips slow page fetch when possible. */
export async function resolveProductContextForAgent(
  productUrl?: string | null,
  existingContext?: string | null,
) {
  const trimmed = productUrl?.trim();
  if (!trimmed) return undefined;
  if (existingContext?.trim()) return existingContext.trim();

  return withTimeout(
    (async () => {
      try {
        const url = await assertPublicHttpUrl(trimmed);
        let pageText: string | undefined;

        try {
          pageText = await withTimeout(fetchPageText(url), AGENT_FETCH_TIMEOUT_MS, "Page fetch");
        } catch {
          pageText = undefined;
        }

        const research = pageText
          ? await withTimeout(
              openaiExtractProductResearch(url, pageText),
              AGENT_OPENAI_TIMEOUT_MS,
              "OpenAI extract",
            )
          : await openaiInferProductFromUrl(url);

        return formatProductResearchContext(research);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Product research failed.";
        return fallbackProductContext(trimmed, message);
      }
    })(),
    AGENT_RESEARCH_TIMEOUT_MS,
    "Product research",
  ).catch((error) => {
    const message = error instanceof Error ? error.message : "Product research failed.";
    return fallbackProductContext(trimmed, message);
  });
}
