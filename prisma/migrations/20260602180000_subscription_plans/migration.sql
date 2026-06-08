-- Expand Plan enum for subscription tiers (FREE, STARTER, PLUS, PRO).
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'STARTER', 'PLUS', 'PRO');

ALTER TABLE "Workspace" ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "Workspace"
  ALTER COLUMN "plan" TYPE "Plan_new"
  USING (
    CASE "plan"::text
      WHEN 'ENTERPRISE' THEN 'PRO'::"Plan_new"
      WHEN 'PRO' THEN 'PRO'::"Plan_new"
      WHEN 'FREE' THEN 'FREE'::"Plan_new"
      ELSE 'FREE'::"Plan_new"
    END
  );

DROP TYPE "Plan";

ALTER TYPE "Plan_new" RENAME TO "Plan";

ALTER TABLE "Workspace" ALTER COLUMN "plan" SET DEFAULT 'FREE';
