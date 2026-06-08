import { NextResponse } from "next/server";

import { bootstrapDatabaseSchema } from "@/lib/db-bootstrap";
import { prisma } from "@/lib/db";

function migrationSecret(request: Request) {
  const secret =
    process.env.EMAIL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();

  if (!secret) {
    return null;
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return false;
  }

  return true;
}

/**
 * Apply pending schema changes on production Neon.
 * POST /api/db/migrate
 * Authorization: Bearer <EMAIL_CRON_SECRET or CRON_SECRET>
 */
export async function POST(request: Request) {
  const authorized = migrationSecret(request);

  if (authorized === null) {
    return NextResponse.json({ error: "Migration secret is not configured." }, { status: 503 });
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await bootstrapDatabaseSchema();

    const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10
    `.catch(() => []);

    return NextResponse.json({
      ok: true,
      ...result,
      recentMigrations: migrations.map((row) => row.migration_name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database migration failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authorized = migrationSecret(request);

  if (authorized === null) {
    return NextResponse.json({ error: "Migration secret is not configured." }, { status: 503 });
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5
    `;

    return NextResponse.json({
      ok: true,
      recentMigrations: migrations.map((row) => row.migration_name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database check failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
