#!/usr/bin/env node
/**
 * One-off BytePlus AK/SK connectivity test.
 * Usage:
 *   BYTEPLUS_ACCESS_KEY=... BYTEPLUS_SECRET_KEY=... node scripts/test-byteplus-api.mjs
 */
import crypto from "crypto";

const accessKey = process.env.BYTEPLUS_ACCESS_KEY?.trim();
const secretKey = process.env.BYTEPLUS_SECRET_KEY?.trim();

if (!accessKey || !secretKey) {
  console.error("Set BYTEPLUS_ACCESS_KEY and BYTEPLUS_SECRET_KEY environment variables.");
  process.exit(1);
}

function sha256(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signRequest({
  method,
  host,
  path,
  query,
  body,
  region,
  service,
}) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? "");
  const canonicalQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/request`;
  const stringToSign = ["HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");

  const kDate = hmac(secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization =
    `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${host}${path}?${canonicalQuery}`,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      "X-Date": amzDate,
      "X-Content-Sha256": payloadHash,
    },
    body,
  };
}

async function callSignedTest(name, options) {
  const signed = signRequest(options);

  try {
    const response = await fetch(signed.url, {
      method: options.method,
      headers: signed.headers,
      body: signed.body,
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      name,
      status: response.status,
      ok: response.ok,
      summary: summarizeResponse(json, text),
      json,
    };
  } catch (error) {
    return {
      name,
      status: 0,
      ok: false,
      summary: error instanceof Error ? error.message : "Network error",
      json: null,
    };
  }
}

function summarizeResponse(json, text) {
  if (!json) return text.slice(0, 240);
  if (json.ResponseMetadata?.Error) {
    return `${json.ResponseMetadata.Error.Code}: ${json.ResponseMetadata.Error.Message}`;
  }
  if (json.error) {
    return `${json.error.code ?? "Error"}: ${json.error.message ?? JSON.stringify(json.error)}`;
  }
  if (json.Result?.TotalCount !== undefined) {
    return `Success — TotalCount=${json.Result.TotalCount}`;
  }
  if (json.Result?.Items?.length !== undefined) {
    return `Success — Items=${json.Result.Items.length}`;
  }
  return text.slice(0, 240);
}

const tests = [
  {
    name: "ModelArk ListFoundationModels",
    method: "POST",
    host: "ark.ap-southeast-1.byteplusapi.com",
    path: "/",
    query: { Action: "ListFoundationModels", Version: "2024-01-01" },
    body: JSON.stringify({ PageNumber: 1, PageSize: 5 }),
    region: "ap-southeast-1",
    service: "ark",
  },
  {
    name: "ModelArk ListFoundationModels (ap-southeast region scope)",
    method: "POST",
    host: "ark.ap-southeast-1.byteplusapi.com",
    path: "/",
    query: { Action: "ListFoundationModels", Version: "2024-01-01" },
    body: JSON.stringify({ PageNumber: 1, PageSize: 5 }),
    region: "ap-southeast",
    service: "ark",
  },
  {
    name: "IAM ListUsers",
    method: "GET",
    host: "open.byteplusapi.com",
    path: "/",
    query: { Action: "ListUsers", Version: "2018-01-01" },
    body: "",
    region: "ap-singapore-1",
    service: "iam",
  },
];

console.log(`Testing BytePlus AK/SK (access key ends with ...${accessKey.slice(-6)})`);
console.log("");

const results = [];
for (const test of tests) {
  const result = await callSignedTest(test.name, test);
  results.push(result);
  console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.name}`);
  console.log(`  HTTP ${result.status} — ${result.summary}`);
  console.log("");
}

const anySuccess = results.some((result) => result.ok);
process.exit(anySuccess ? 0 : 1);
