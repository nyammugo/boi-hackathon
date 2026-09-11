import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

function run(command, args, capture = false) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

async function setup() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    // Reuse a running native Postgres before starting another database.
    const native = run(
      "psql",
      ["-h", "localhost", "-d", "postgres", "-Atc", "SELECT current_user"],
      true,
    );
    if (native.status === 0) {
      const user = native.stdout.trim();
      const exists = run(
        "psql",
        [
          "-h",
          "localhost",
          "-d",
          "postgres",
          "-Atc",
          "SELECT 1 FROM pg_database WHERE datname = 'hackathon_chat'",
        ],
        true,
      );
      if (exists.status !== 0)
        throw new Error("Could not inspect local Postgres.");
      if (
        exists.stdout.trim() !== "1" &&
        run("createdb", ["-h", "localhost", "hackathon_chat"]).status !== 0
      )
        throw new Error("Could not create hackathon_chat.");
      url = `postgresql://${encodeURIComponent(user)}@localhost:5432/hackathon_chat`;
      console.log(
        "Using native Postgres with the dedicated hackathon_chat database.",
      );
    } else if (run("docker", ["info"], true).status === 0) {
      if (run("docker", ["compose", "up", "-d", "--wait", "db"]).status !== 0)
        throw new Error("Could not start Postgres with Docker Compose.");
      url = "postgresql://plainly:plainly@localhost:5433/plainly";
      console.log("Using the project Docker Postgres instance.");
    } else {
      throw new Error(
        "No reachable Postgres or running Docker daemon. Start Docker Desktop or a local Postgres service, then rerun npm run setup. You can also set DATABASE_URL to an existing local database.",
      );
    }
    let existing = "";
    try {
      existing = readFileSync(".env", "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const line = `DATABASE_URL=${url}`;
    const next = /^DATABASE_URL\s*=/m.test(existing)
      ? existing.replace(/^DATABASE_URL\s*=.*$/m, line)
      : `${existing}${existing.endsWith("\n") || !existing ? "" : "\n"}${line}\n`;
    writeFileSync(".env", next, { mode: 0o600 });
  } else {
    console.log("Using the configured DATABASE_URL.");
  }
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });
  try {
    await pool.query(
      readFileSync(new URL("../server/schema.sql", import.meta.url), "utf8"),
    );
  } finally {
    await pool.end();
  }
  console.log("Database schema is ready.");
  console.log(
    process.env.AZURE_CLIENT_SECRET &&
      process.env.AZURE_AI_ENDPOINT &&
      process.env.DEMO_MODE !== "true"
      ? "Foundry credentials detected. Run npm run dev."
      : "Demo mode is ready; no AI key is needed. Run npm run dev.",
  );
}

setup().catch((error) => {
  console.error(`Setup failed: ${error.message}`);
  process.exitCode = 1;
});
