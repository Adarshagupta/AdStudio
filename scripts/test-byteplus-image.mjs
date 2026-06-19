#!/usr/bin/env node
/**
 * BytePlus ModelArk image generation smoke test.
 *
 * Loads values from the project `.env` (overriding any stale system env vars
 * of the same name), then falls back to the actual process environment.
 *
 * Usage:
 *   node scripts/test-byteplus-image.mjs
 *   BYTEPLUS_API_KEY=... node scripts/test-byteplus-image.mjs   (force override)
 */
import fs from "fs";
import path from "path";

// Load `.env` so values take precedence over inherited (possibly stale) system env.
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m && (m[1].startsWith("BYTEPLUS") || m[1].startsWith("ARK"))) {
      process.env[m[1]] = m[2];
    }
  }
}

const accessKey = process.env.BYTEPLUS_ACCESS_KEY?.trim();
const secretKey = process.env.BYTEPLUS_SECRET_KEY?.trim();
const apiKey = process.env.BYTEPLUS_API_KEY?.trim() || secretKey;

if (!apiKey && !accessKey) {
  console.error("Set BYTEPLUS_API_KEY or BYTEPLUS_ACCESS_KEY + BYTEPLUS_SECRET_KEY.");
  process.exit(1);
}

const prompt = "A minimalist product photo of a sleek wireless earbuds case on a marble surface, soft studio lighting";

const baseUrls = [
  "https://ark.ap-southeast.bytepluses.com/api/v3",
  "https://ark.ap-southeast-1.bytepluses.com/api/v3",
  "https://ark.ap-southeast-1.byteplusapi.com/api/v3",
];

// Try the env-configured model first (so the working model always leads),
// then fall back to other Seedream variants for discovery.
const envModel = process.env.BYTEPLUS_IMAGE_MODEL?.trim();
const models = [
  ...(envModel ? [envModel] : []),
  ...[
    "seedream-5-0-260128",
    "seedream-5-0-lite-260128",
    "seedream-4-5-251128",
    "seedream-4-0-250828",
  ].filter((m) => m !== envModel),
];

async function tryImageGeneration(label, url, headers, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const summary = json?.error
      ? `${json.error.code ?? "Error"}: ${json.error.message ?? JSON.stringify(json.error)}`
      : json?.ResponseMetadata?.Error
        ? `${json.ResponseMetadata.Error.Code}: ${json.ResponseMetadata.Error.Message}`
        : json?.data?.[0]?.url
          ? `Success — image URL returned`
          : json?.data?.[0]?.b64_json
            ? `Success — base64 image returned`
            : text.slice(0, 300);

    return { label, status: response.status, ok: response.ok, summary, json, text };
  } catch (error) {
    return {
      label,
      status: 0,
      ok: false,
      summary: error instanceof Error ? error.message : "Network error",
      json: null,
      text: "",
    };
  }
}

console.log("BytePlus image generation smoke test");
console.log(`Prompt: ${prompt.slice(0, 80)}...`);
console.log("");

const attempts = [];

for (const baseUrl of baseUrls) {
  for (const model of models) {
    attempts.push({
      label: `Bearer ${model} @ ${baseUrl}`,
      url: `${baseUrl}/images/generations`,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        prompt,
        size: "2K",
        response_format: "url",
        sequential_image_generation: "disabled",
        watermark: true,
      },
    });
  }
}

if (accessKey && secretKey) {
  attempts.push({
    label: `Bearer access key @ ark.ap-southeast.bytepluses.com`,
    url: "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
    headers: { Authorization: `Bearer ${accessKey}` },
    body: {
      model: "seedream-5-0-260128",
      prompt,
      size: "2K",
      response_format: "url",
      sequential_image_generation: "disabled",
      watermark: true,
    },
  });
}

let success = null;

for (const attempt of attempts) {
  const result = await tryImageGeneration(
    attempt.label,
    attempt.url,
    attempt.headers,
    attempt.body,
  );
  console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.label}`);
  console.log(`  HTTP ${result.status} — ${result.summary}`);

  if (result.ok && result.json) {
    success = result;
    const imageUrl = result.json?.data?.[0]?.url;
    const b64 = result.json?.data?.[0]?.b64_json;
    if (imageUrl) {
      console.log(`  URL: ${imageUrl}`);
    }
    if (b64) {
      const outDir = path.join(process.cwd(), "scripts", "output");
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, "byteplus-test.png");
      fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
      console.log(`  Saved: ${outPath}`);
    }
    break;
  }
  console.log("");
}

if (!success) {
  console.error("All image generation attempts failed.");
  process.exit(1);
}

console.log("\nImage generation succeeded.");
