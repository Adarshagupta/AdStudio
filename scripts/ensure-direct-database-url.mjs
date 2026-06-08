import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  process.exit(0);
}

const content = fs.readFileSync(envPath, "utf8");

if (/^DIRECT_DATABASE_URL=/m.test(content)) {
  process.exit(0);
}

const databaseLine = content.match(/^DATABASE_URL=(.+)$/m);
if (!databaseLine) {
  process.exit(0);
}

const pooled = databaseLine[1].replace(/^["']|["']$/g, "");
const direct = pooled.includes("-pooler.") ? pooled.replace("-pooler.", ".") : pooled;

const separator = content.endsWith("\n") ? "" : "\n";
fs.appendFileSync(envPath, `${separator}DIRECT_DATABASE_URL="${direct}"\n`);
