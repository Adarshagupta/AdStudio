#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const root = process.cwd();
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

let dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("connection_limit")) {
  dbUrl += dbUrl.includes("?") ? "&connection_limit=1" : "?connection_limit=1";
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function genCode(tx) {
  for (let i = 0; i < 12; i++) {
    const code = randomBytes(6)
      .toString("base64url")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase()
      .padEnd(8, "X");
    const ex = await tx.user.findUnique({ where: { referralCode: code } });
    if (!ex) return code;
  }
  throw new Error("Could not generate referral code");
}

const REFERRER_CODE = process.argv[2] ?? "RYXVH1J1";
const REFERRED_EMAILS = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["t71@bitsend.online", "company@fortexa.tech"];

async function main() {
  const referrer = await prisma.user.findUnique({ where: { referralCode: REFERRER_CODE } });
  if (!referrer) {
    console.error("Referrer not found for code:", REFERRER_CODE);
    process.exit(1);
  }

  console.log("Referrer:", referrer.email, REFERRER_CODE);

  const main = await prisma.user.findUnique({ where: { email: "gupta1ujjawal@gmail.com" } });
  if (main && !main.referralCode) {
    const code = await genCode(prisma);
    await prisma.user.update({ where: { id: main.id }, data: { referralCode: code } });
    console.log("Assigned main account code:", code);
  }

  for (const email of REFERRED_EMAILS) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      console.log("Missing user:", email);
      continue;
    }

    if (!u.referralCode) {
      const code = await genCode(prisma);
      await prisma.user.update({ where: { id: u.id }, data: { referralCode: code } });
    }

    if (!u.referredByUserId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { referredByUserId: referrer.id },
      });
      console.log("Attributed", email, "->", REFERRER_CODE);
    } else {
      console.log("Already attributed:", email);
    }
  }

  const count = await prisma.user.count({ where: { referredByUserId: referrer.id } });
  console.log("Total signups for", REFERRER_CODE + ":", count);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
