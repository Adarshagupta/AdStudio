import "server-only";

import { prisma } from "@/lib/db";
import { isPrismaSchemaMismatch } from "@/lib/user-db";

let bootstrapPromise: Promise<{ applied: string[]; skipped: string[] }> | null = null;

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(tableName: string, columnName: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function planEnumHas(label: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'Plan' AND e.enumlabel = ${label}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function applyWorkspaceMembersMigration() {
  const applied: string[] = [];

  if (!(await tableExists("WorkspaceMember"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "WorkspaceMember" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'MEMBER',
        "permissions" JSONB NOT NULL DEFAULT '{}',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
      )
    `);
    applied.push("WorkspaceMember table");
  }

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_userId_workspaceId_key"
    ON "WorkspaceMember"("userId", "workspaceId")
  `);

  if (await columnExists("User", "workspaceId")) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "permissions", "isActive", "createdAt")
      SELECT
        'wm_' || u."id",
        u."id",
        u."workspaceId",
        COALESCE(u."role", 'ADMIN'::"Role"),
        COALESCE(u."permissions", '{}'::jsonb),
        u."isActive",
        u."createdAt"
      FROM "User" u
      WHERE u."workspaceId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "WorkspaceMember" wm
          WHERE wm."userId" = u."id" AND wm."workspaceId" = u."workspaceId"
        )
    `);
    applied.push("WorkspaceMember backfill");
  }

  if (!(await columnExists("User", "lastWorkspaceId"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "lastWorkspaceId" TEXT`);
    applied.push("User.lastWorkspaceId column");
  }

  if (await columnExists("User", "workspaceId")) {
    await prisma.$executeRawUnsafe(`
      UPDATE "User"
      SET "lastWorkspaceId" = "workspaceId"
      WHERE "workspaceId" IS NOT NULL AND "lastWorkspaceId" IS NULL
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey"
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "workspaceId"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "role"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "permissions"`);
    applied.push("legacy User workspace columns removed");
  }

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_isActive_idx"
    ON "WorkspaceMember"("workspaceId", "isActive")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_isActive_idx"
    ON "WorkspaceMember"("userId", "isActive")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "User_lastWorkspaceId_idx" ON "User"("lastWorkspaceId")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "User"
        ADD CONSTRAINT "User_lastWorkspaceId_fkey"
        FOREIGN KEY ("lastWorkspaceId") REFERENCES "Workspace"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "WorkspaceMember"
        ADD CONSTRAINT "WorkspaceMember_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "WorkspaceMember"
        ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  return applied;
}

async function applySubscriptionPlansMigration() {
  if (await planEnumHas("STARTER")) {
    return [] as string[];
  }

  await prisma.$executeRawUnsafe(`
    CREATE TYPE "Plan_new" AS ENUM ('FREE', 'STARTER', 'PLUS', 'PRO')
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Workspace" ALTER COLUMN "plan" DROP DEFAULT`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Workspace"
      ALTER COLUMN "plan" TYPE "Plan_new"
      USING (
        CASE "plan"::text
          WHEN 'ENTERPRISE' THEN 'PRO'::"Plan_new"
          WHEN 'PRO' THEN 'PRO'::"Plan_new"
          WHEN 'FREE' THEN 'FREE'::"Plan_new"
          ELSE 'FREE'::"Plan_new"
        END
      )
  `);
  await prisma.$executeRawUnsafe(`DROP TYPE "Plan"`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "Plan_new" RENAME TO "Plan"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Workspace" ALTER COLUMN "plan" SET DEFAULT 'FREE'`);

  return ["Plan enum (FREE, STARTER, PLUS, PRO)"];
}

async function applyUserMediaAssetsMigration() {
  if (await tableExists("UserMediaAsset")) {
    return [] as string[];
  }

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MediaAssetSource" AS ENUM ('UPLOADED', 'GENERATED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "UserMediaAsset" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "workspaceId" TEXT NOT NULL,
      "kind" "MediaAssetKind" NOT NULL,
      "source" "MediaAssetSource" NOT NULL,
      "url" TEXT NOT NULL,
      "name" TEXT,
      "mimeType" TEXT,
      "width" INTEGER,
      "height" INTEGER,
      "durationSec" INTEGER,
      "byteSize" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserMediaAsset_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UserMediaAsset_userId_kind_createdAt_idx"
    ON "UserMediaAsset"("userId", "kind", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UserMediaAsset_workspaceId_createdAt_idx"
    ON "UserMediaAsset"("workspaceId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UserMediaAsset_userId_url_key"
    ON "UserMediaAsset"("userId", "url")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "UserMediaAsset"
        ADD CONSTRAINT "UserMediaAsset_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "UserMediaAsset"
        ADD CONSTRAINT "UserMediaAsset_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  return ["UserMediaAsset table"];
}

async function recordPrismaMigrations(names: string[]) {
  if (!(await tableExists("_prisma_migrations"))) {
    return;
  }

  for (const migrationName of names) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        SELECT gen_random_uuid()::text, '', NOW(), ${migrationName}, NULL, NULL, NOW(), 1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = ${migrationName}
        )
      `;
    } catch {
      // Non-fatal if migration history cannot be recorded.
    }
  }
}

export async function bootstrapDatabaseSchema() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const applied: string[] = [];
      const skipped: string[] = [];

      try {
        const workspaceSteps = await applyWorkspaceMembersMigration();
        applied.push(...workspaceSteps);

        const planSteps = await applySubscriptionPlansMigration();
        applied.push(...planSteps);

        const mediaAssetSteps = await applyUserMediaAssetsMigration();
        applied.push(...mediaAssetSteps);

        if (workspaceSteps.length > 0) {
          await recordPrismaMigrations(["20260602120000_workspace_members"]);
        }
        if (planSteps.length > 0) {
          await recordPrismaMigrations(["20260602180000_subscription_plans"]);
        }
        if (mediaAssetSteps.length > 0) {
          await recordPrismaMigrations(["20260604180000_user_media_assets"]);
        }
      } catch (error) {
        bootstrapPromise = null;
        throw error;
      }

      if (applied.length === 0) {
        skipped.push("schema already up to date");
      }

      return { applied, skipped };
    })();
  }

  return bootstrapPromise;
}

export async function tryBootstrapDatabaseSchema() {
  try {
    return await bootstrapDatabaseSchema();
  } catch (error) {
    console.error("[db-bootstrap] Failed:", error);
    return null;
  }
}

export async function resolveAuthWithBootstrap<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) {
      throw error;
    }

    await tryBootstrapDatabaseSchema();
    return loader();
  }
}
