import path from "node:path";
import process from "node:process";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.test"));
} catch {
  // .env.test missing: rely on ambient env vars (e.g. set by CI).
}
