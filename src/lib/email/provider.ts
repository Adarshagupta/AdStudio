import "server-only";

import net from "net";
import tls from "tls";
import type { EmailChannel, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type EmailAddress = string | { address: string; name?: string };
type EmailProvider = "smtp" | "cloudflare";

export type SendEmailInput = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  text: string;
  html?: string;
  channel: EmailChannel;
  workspaceId?: string | null;
  userId?: string | null;
  replyTo?: EmailAddress;
  metadata?: Prisma.InputJsonValue;
  headers?: Record<string, string>;
};

type CloudflareSendResponse = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: {
    delivered?: string[];
    queued?: string[];
    permanent_bounces?: string[];
  };
};

export function getEmailConfigStatus() {
  const provider = getEmailProvider();
  const missing =
    provider === "smtp"
      ? ([
          ["SMTP_HOST", process.env.SMTP_HOST],
          ["SMTP_PORT", process.env.SMTP_PORT],
          ["SMTP_USER", process.env.SMTP_USER],
          ["SMTP_PASS", process.env.SMTP_PASS],
          ["EMAIL_FROM", process.env.EMAIL_FROM],
        ] satisfies Array<[string, string | undefined]>)
      : ([
          ["CLOUDFLARE_EMAIL_ACCOUNT_ID", process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID],
          ["CLOUDFLARE_EMAIL_API_TOKEN", process.env.CLOUDFLARE_EMAIL_API_TOKEN],
          ["EMAIL_FROM", process.env.EMAIL_FROM],
        ] satisfies Array<[string, string | undefined]>);
  const missingKeys = missing
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  const warnings = getEmailConfigWarnings(provider);

  return {
    provider: getEmailProviderName(provider),
    ready: missingKeys.length === 0,
    missing: missingKeys,
    warnings,
    from: getFromAddress(),
    replyTo: getReplyToAddress(),
  };
}

export async function sendTrackedEmail(input: SendEmailInput) {
  const toAddresses = Array.isArray(input.to) ? input.to : [input.to];
  const normalizedTo = toAddresses.map(formatAddressForLog).join(", ");
  const from = getFromAddress();
  const provider = getEmailProvider();
  const providerName = getEmailProviderName(provider);
  const event = await prisma.emailEvent.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      userId: input.userId ?? null,
      toEmail: normalizedTo,
      fromEmail: formatAddressForLog(from),
      subject: input.subject,
      channel: input.channel,
      status: "FAILED",
      provider: providerName,
      metadata: input.metadata ?? {},
    },
  });

  try {
    const result = await sendWithConfiguredProvider({
      to: input.to,
      from,
      replyTo: input.replyTo ?? getReplyToAddress(),
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    });

    const wasAccepted = result.accepted;

    await prisma.emailEvent.update({
      where: { id: event.id },
      data: {
        status: wasAccepted ? "SENT" : "FAILED",
        sentAt: wasAccepted ? new Date() : null,
        providerMessageId: result.messageId,
        errorMessage: result.errorMessage ?? null,
        metadata: {
          ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
            ? input.metadata
            : {}),
          [provider]: result.metadata ?? {},
        },
      },
    });

    if (!wasAccepted) {
      throw new Error("Email provider did not accept any recipients.");
    }

    return result;
  } catch (error) {
    await prisma.emailEvent.update({
      where: { id: event.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Email delivery failed.",
      },
    });

    throw error;
  }
}

async function sendWithConfiguredProvider(input: {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}) {
  if (getEmailProvider() === "cloudflare") {
    const result = await sendViaCloudflare(input);
    const delivered = result.result?.delivered ?? [];
    const queued = result.result?.queued ?? [];
    const bounced = result.result?.permanent_bounces ?? [];

    return {
      accepted: delivered.length > 0 || queued.length > 0,
      messageId: undefined,
      errorMessage: bounced.length > 0 ? `Permanent bounce: ${bounced.join(", ")}` : undefined,
      metadata: result.result ?? {},
    };
  }

  return sendViaSmtp(input);
}

async function sendViaCloudflare(input: {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}) {
  const config = getEmailConfigStatus();

  if (!config.ready) {
    throw new Error(`Email is not configured. Missing: ${config.missing.join(", ")}`);
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID}/email/sending/send`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_EMAIL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: normalizeAddressPayload(input.to),
      from: normalizeAddressPayload(input.from),
      reply_to: input.replyTo ? normalizeAddressPayload(input.replyTo) : undefined,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    }),
  });
  const data = (await response.json().catch(() => null)) as CloudflareSendResponse | null;

  if (!response.ok || !data?.success) {
    const message =
      data?.errors?.map((error) => error.message ?? error.code).filter(Boolean).join(", ") ||
      `Cloudflare email request failed with ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

async function sendViaSmtp(input: {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}) {
  const config = getEmailConfigStatus();

  if (!config.ready) {
    throw new Error(`Email is not configured. Missing: ${config.missing.join(", ")}`);
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = parseBoolean(process.env.SMTP_SECURE) ?? port === 465;
  const requireTls = parseBoolean(process.env.SMTP_REQUIRE_TLS) ?? !secure;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  const fromEmail = getAddressOnly(input.from);
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(getAddressOnly);
  const client = await createSmtpClient({ host, port, secure });

  try {
    await client.expect(220);
    let capabilities = await client.command(`EHLO ${getSmtpHostname()}`, 250);

    if (!secure && capabilities.text.includes("STARTTLS")) {
      await client.command("STARTTLS", 220);
      await client.startTls(host);
      capabilities = await client.command(`EHLO ${getSmtpHostname()}`, 250);
    } else if (!secure && requireTls) {
      throw new Error("SMTP server did not advertise STARTTLS.");
    }

    if (user || pass) {
      if (capabilities.text.includes("AUTH") && capabilities.text.includes("PLAIN")) {
        await client.command(`AUTH PLAIN ${Buffer.from(`\0${user ?? ""}\0${pass}`).toString("base64")}`, 235);
      } else {
        await client.command("AUTH LOGIN", 334);
        await client.command(Buffer.from(user ?? "").toString("base64"), 334);
        await client.command(Buffer.from(pass).toString("base64"), 235);
      }
    }

    await client.command(`MAIL FROM:<${fromEmail}>`, 250);

    for (const recipient of recipients) {
      await client.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }

    await client.command("DATA", 354);
    const messageId = createMessageId(fromEmail);
    await client.writeData(buildMimeMessage({
      from: input.from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
      messageId,
    }));
    await client.expect(250);
    await client.command("QUIT", 221).catch(() => undefined);

    return {
      accepted: true,
      messageId,
      errorMessage: undefined,
      metadata: {
        host,
        port,
        secure,
        recipients,
      },
    };
  } finally {
    client.close();
  }
}

function getFromAddress(): EmailAddress {
  const address = process.env.EMAIL_FROM?.trim() || "noreply@example.com";
  const name = process.env.EMAIL_FROM_NAME?.trim();

  return name ? { address, name } : address;
}

export function getEmailProviderName(provider = getEmailProvider()) {
  return provider === "smtp" ? "smtp" : "cloudflare-email-service";
}

function getEmailProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (configured === "cloudflare" || configured === "cloudflare-email-service") {
    return "cloudflare";
  }

  if (configured === "smtp") {
    return "smtp";
  }

  return process.env.SMTP_HOST?.trim() ? "smtp" : "cloudflare";
}

function getEmailConfigWarnings(provider: EmailProvider) {
  const warnings: string[] = [];
  const host = process.env.SMTP_HOST?.trim().toLowerCase() ?? "";
  const from = process.env.EMAIL_FROM?.trim().toLowerCase() ?? "";

  if (provider === "smtp" && host.includes("brevo") && from.endsWith("@smtp-brevo.com")) {
    warnings.push("EMAIL_FROM should be a verified Brevo sender email, not the SMTP login.");
  }

  return warnings;
}

function getReplyToAddress(): EmailAddress | undefined {
  const address = process.env.EMAIL_REPLY_TO?.trim();

  if (!address) return undefined;

  const name = process.env.EMAIL_REPLY_TO_NAME?.trim();
  return name ? { address, name } : address;
}

function normalizeAddressPayload(value: EmailAddress | EmailAddress[]) {
  if (Array.isArray(value)) {
    return value.map(normalizeSingleAddress);
  }

  return normalizeSingleAddress(value);
}

function normalizeSingleAddress(value: EmailAddress) {
  if (typeof value === "string") {
    return value;
  }

  return {
    address: value.address,
    name: value.name,
  };
}

function formatAddressForLog(value: EmailAddress) {
  if (typeof value === "string") {
    return value;
  }

  return value.name ? `${value.name} <${value.address}>` : value.address;
}

async function createSmtpClient({
  host,
  port,
  secure,
}: {
  host: string;
  port: number;
  secure: boolean;
}) {
  let socket: net.Socket | tls.TLSSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  let buffer = "";
  const lines: string[] = [];
  let waiter: (() => void) | null = null;

  socket.setEncoding("utf8");
  socket.setTimeout(Number(process.env.SMTP_TIMEOUT_MS || "30000"));

  socket.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    lines.push(...parts.filter(Boolean));
    waiter?.();
  });

  socket.on("error", (error) => {
    throw error;
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connection timed out.")));
  });

  async function readResponse() {
    while (true) {
      const response = consumeSmtpResponse(lines);

      if (response) return response;

      await new Promise<void>((resolve) => {
        waiter = () => {
          waiter = null;
          resolve();
        };
      });
    }
  }

  function write(command: string) {
    socket.write(`${command}\r\n`);
  }

  return {
    async expect(expected: number | number[]) {
      const response = await readResponse();
      assertSmtpCode(response, expected);
      return response;
    },
    async command(command: string, expected: number | number[]) {
      write(command);
      const response = await readResponse();
      assertSmtpCode(response, expected);
      return response;
    },
    async writeData(message: string) {
      socket.write(`${dotStuff(message)}\r\n.\r\n`);
    },
    async startTls(servername: string) {
      socket.removeAllListeners("data");
      socket = tls.connect({ socket, servername });
      buffer = "";
      lines.length = 0;
      socket.setEncoding("utf8");
      socket.setTimeout(Number(process.env.SMTP_TIMEOUT_MS || "30000"));
      socket.on("data", (chunk) => {
        buffer += chunk;
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop() ?? "";
        lines.push(...parts.filter(Boolean));
        waiter?.();
      });
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", resolve);
        socket.once("error", reject);
      });
    },
    close() {
      socket.end();
      socket.destroy();
    },
  };
}

function consumeSmtpResponse(lines: string[]) {
  const consumed: string[] = [];

  while (lines.length > 0) {
    const line = lines.shift()!;
    consumed.push(line);

    if (/^\d{3} /.test(line)) {
      return {
        code: Number(line.slice(0, 3)),
        text: consumed.join("\n"),
      };
    }
  }

  lines.unshift(...consumed);
  return null;
}

function assertSmtpCode(response: { code: number; text: string }, expected: number | number[]) {
  const expectedCodes = Array.isArray(expected) ? expected : [expected];

  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed with ${response.code}: ${response.text}`);
  }
}

function buildMimeMessage(input: {
  from: EmailAddress;
  to: EmailAddress | EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  messageId: string;
}) {
  const boundary = `adstudio-${crypto.randomUUID()}`;
  const to = Array.isArray(input.to) ? input.to.map(formatMimeAddress).join(", ") : formatMimeAddress(input.to);
  const headers = [
    ["From", formatMimeAddress(input.from)],
    ["To", to],
    ["Subject", encodeHeader(input.subject)],
    ["Message-ID", input.messageId],
    ["Date", new Date().toUTCString()],
    ["MIME-Version", "1.0"],
    input.replyTo ? ["Reply-To", formatMimeAddress(input.replyTo)] : null,
    ...Object.entries(input.headers ?? {}),
  ].filter(Boolean) as string[][];

  if (!input.html) {
    return [
      ...headers.map(([key, value]) => `${key}: ${value}`),
      "Content-Type: text/plain; charset=utf-8",
      "",
      input.text,
    ].join("\r\n");
  }

  return [
    ...headers.map(([key, value]) => `${key}: ${value}`),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    input.html,
    `--${boundary}--`,
  ].join("\r\n");
}

function formatMimeAddress(value: EmailAddress) {
  if (typeof value === "string") {
    return value;
  }

  return value.name ? `${encodeHeader(value.name)} <${value.address}>` : value.address;
}

function encodeHeader(value: string) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function getAddressOnly(value: EmailAddress) {
  return typeof value === "string" ? value : value.address;
}

function dotStuff(message: string) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function createMessageId(fromEmail: string) {
  const domain = fromEmail.split("@")[1] || "localhost";
  return `<${crypto.randomUUID()}@${domain}>`;
}

function getSmtpHostname() {
  return process.env.SMTP_EHLO_NAME?.trim() || "localhost";
}

function parseBoolean(value: string | undefined) {
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  return undefined;
}
