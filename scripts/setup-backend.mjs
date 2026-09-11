import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { WorkOS } from "@workos-inc/node";

const origin = "https://staging.boi.buildprompt.app";
const sessionPath = ".backend-session.json";
function az(args) {
  return execFileSync("az", [...args, "--only-show-errors", "-o", "tsv"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function setup() {
  if (existsSync(sessionPath))
    throw new Error(
      "A backend session already exists. Reuse it; do not create or renew temporary access without an explicit request.",
    );
  const clientId = az([
    "containerapp",
    "show",
    "--name",
    "buildprompt-boi-staging-app",
    "--resource-group",
    "buildprompt-boi-staging-rg",
    "--query",
    "properties.template.containers[0].env[?name=='WORKOS_CLIENT_ID'].value | [0]",
  ]);
  const apiKey = az([
    "keyvault",
    "secret",
    "show",
    "--vault-name",
    "bp-boi-stg-kv-df2c77",
    "--name",
    "workos-api-key",
    "--query",
    "value",
  ]);
  const cookiePassword = az([
    "keyvault",
    "secret",
    "show",
    "--vault-name",
    "bp-boi-stg-kv-df2c77",
    "--name",
    "workos-cookie-password",
    "--query",
    "value",
  ]);
  if (!apiKey.startsWith("sk_test_"))
    throw new Error("Expected a WorkOS staging key. No identity was created.");
  const workos = new WorkOS(apiKey, { clientId });
  const password = randomUUID() + randomUUID();
  const email = `plainly-hackathon+${randomUUID().slice(0, 8)}@buildprompt.ai`;
  let user;
  try {
    user = await workos.userManagement.createUser({
      email,
      password,
      emailVerified: true,
      firstName: "Plainly",
      lastName: "Hackathon",
      metadata: {
        created_by: "plainly-hackathon",
        purpose: "boi-staging-chat",
      },
    });
    const { sealedSession } =
      await workos.userManagement.authenticateWithPassword({
        clientId,
        email,
        password,
        session: { sealSession: true, cookiePassword },
      });
    if (!sealedSession)
      throw new Error("WorkOS did not return a sealed session.");
    const cookie = `wos-session=${sealedSession}`;
    const check = await fetch(`${origin}/api/trpc/modelDefaults.get`, {
      headers: { cookie },
      redirect: "manual",
    });
    if (!check.ok)
      throw new Error(
        `Staging authentication check returned HTTP ${check.status}.`,
      );
    const data = await check.json();
    if (data.error)
      throw new Error("Staging rejected the authenticated session.");
    const expiresAt =
      process.env.AZURE_CREDENTIAL_EXPIRES_AT ||
      new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    if (Date.parse(expiresAt) <= Date.now())
      throw new Error("The authorized access window has already expired.");
    writeFileSync(
      sessionPath,
      JSON.stringify(
        { origin, cookie, expiresAt, workosUserId: user.id },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    let env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
    const line = `BUILDPROMPT_URL=${origin}`;
    env = /^BUILDPROMPT_URL=/m.test(env)
      ? env.replace(/^BUILDPROMPT_URL=.*$/m, line)
      : `${env.trimEnd()}\n${line}\n`;
    writeFileSync(".env", env, { mode: 0o600 });
    console.log(`Connected to ${origin}.`);
    console.log(`Dedicated staging identity: ${user.id}`);
    console.log(`Local access deadline: ${expiresAt}`);
    console.log(
      "Only a sealed backend session is stored locally. No login is needed in the web app. Restart the server.",
    );
  } catch (error) {
    if (user) await workos.userManagement.deleteUser(user.id);
    throw error;
  }
}

setup().catch((error) => {
  console.error(
    error instanceof Error && !("stdout" in error)
      ? error.message
      : "Azure credential lookup failed. Check your staging Key Vault access.",
  );
  process.exitCode = 1;
});
