import { Prisma } from "@prisma/client";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export function isNeonQuotaExceeded(error: unknown) {
  return errorMessage(error).includes("data transfer quota");
}

export function isDatabaseUnreachable(error: unknown) {
  const message = errorMessage(error);

  if (isNeonQuotaExceeded(error)) {
    return true;
  }

  if (message.includes("Can't reach database server")) {
    return true;
  }

  if (message.includes("connection pool timeout")) {
    return true;
  }

  if (message.includes("Timed out fetching a new connection")) {
    return true;
  }

  return false;
}

export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/** Schema out of date (missing table/column) or connection issues. */
export function isDatabaseSetupError(error: unknown) {
  if (isDatabaseUnreachable(error)) {
    return true;
  }

  if (!isPrismaError(error)) {
    return false;
  }

  return ["P1001", "P1008", "P1017", "P2021", "P2022"].includes(error.code);
}

export function databaseSetupErrorMessage(error: unknown) {
  if (isNeonQuotaExceeded(error)) {
    return "Neon data transfer quota exceeded. Open console.neon.tech, upgrade or wait for quota reset, then redeploy.";
  }

  if (isDatabaseUnreachable(error)) {
    return "Database is offline or waking up. Resume the Neon project in console.neon.tech, then try again in ~30 seconds.";
  }

  if (isPrismaError(error) && error.code === "P2021") {
    return "Database schema is out of date. Run prisma migrate deploy on production.";
  }

  if (isPrismaError(error) && error.code === "P1001") {
    return "Database is unreachable. Resume your Neon project and verify DATABASE_URL on Vercel.";
  }

  if (isPrismaError(error) && error.code.startsWith("P10")) {
    return "Could not connect to the database. Check DATABASE_URL on Vercel and that the Neon project is active.";
  }

  return error instanceof Error ? error.message : "Database error.";
}
