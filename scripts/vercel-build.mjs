import { spawnSync } from "node:child_process";

const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

if (!hasDatabase) {
  console.log("Skipping database setup: DATABASE_URL or POSTGRES_URL is not configured.");
  process.exit(0);
}

for (const script of ["migrate", "seed"]) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
