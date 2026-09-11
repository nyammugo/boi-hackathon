import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    resource: { type: "string" },
    "resource-group": { type: "string" },
    deployment: { type: "string" },
  },
});

function az(args) {
  // Capture stdout: commands that issue credentials must never print them.
  const output = execFileSync(
    "az",
    [...args, "--only-show-errors", "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 },
  );
  return output.trim() ? JSON.parse(output) : undefined;
}

function setup() {
  if (!values.resource || !values["resource-group"] || !values.deployment)
    throw new Error(
      "Provide --resource, --resource-group and --deployment. See README.md.",
    );
  if (process.env.AZURE_CLIENT_ID)
    throw new Error(
      "Foundry credentials already exist. Reuse them. Do not extend temporary access without an explicit request.",
    );
  const args = [
    "--name",
    values.resource,
    "--resource-group",
    values["resource-group"],
  ];
  const resource = az(["cognitiveservices", "account", "show", ...args]);
  const deployment = az([
    "cognitiveservices",
    "account",
    "deployment",
    "show",
    ...args,
    "--deployment-name",
    values.deployment,
  ]);
  if (deployment.properties.model.name !== "claude-sonnet-5")
    throw new Error(
      "The selected deployment is not Sonnet 5. No credentials were created.",
    );
  const account = az(["account", "show"]);
  const endpoint = resource.properties.endpoints?.["AI Foundry API"];
  if (!endpoint) throw new Error("The resource has no Foundry API endpoint.");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
  const name = `plainly-hackathon-${randomUUID().slice(0, 8)}`;
  let app;
  let assignment;
  let stage = "application registration";
  try {
    app = az(["ad", "app", "create", "--display-name", name]);
    stage = "service principal creation";
    const principal = az(["ad", "sp", "create", "--id", app.appId]);
    stage = "resource role assignment";
    assignment = az([
      "role",
      "assignment",
      "create",
      "--assignee-object-id",
      principal.id,
      "--assignee-principal-type",
      "ServicePrincipal",
      "--role",
      "Cognitive Services User",
      "--scope",
      resource.id,
    ]);
    stage = "24-hour credential creation";
    const credential = az([
      "ad",
      "app",
      "credential",
      "reset",
      "--id",
      app.id,
      "--append",
      "--display-name",
      "Hackathon access — 24 hours",
      "--end-date",
      expiresAt,
    ]);
    stage = "expiry verification";
    const metadata = az(["ad", "app", "credential", "list", "--id", app.id]);
    if (
      !metadata.some(
        (item) => Date.parse(item.endDateTime) === Date.parse(expiresAt),
      )
    )
      throw new Error("Azure did not confirm the requested credential expiry.");
    stage = "local configuration";
    const config = {
      AZURE_AI_ENDPOINT: endpoint.replace(/\/$/, ""),
      AZURE_AI_DEPLOYMENT: values.deployment,
      AZURE_TENANT_ID: account.tenantId,
      AZURE_CLIENT_ID: app.appId,
      AZURE_CLIENT_SECRET: credential.password,
      AZURE_CREDENTIAL_EXPIRES_AT: expiresAt,
      DEMO_MODE: "false",
    };
    let contents = "";
    try {
      contents = readFileSync(".env", "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    for (const [key, value] of Object.entries(config)) {
      const pattern = new RegExp(`^${key}=.*$`, "m");
      contents = pattern.test(contents)
        ? contents.replace(pattern, () => `${key}=${value}`)
        : `${contents.trimEnd()}\n${key}=${value}\n`;
    }
    writeFileSync(".env", contents, { mode: 0o600 });
    chmodSync(".env", 0o600);
    console.log(`Sonnet 5 configured on ${values.resource}.`);
    console.log(`Application: ${app.appId}`);
    console.log(`Credential expires: ${expiresAt}`);
    console.log(
      "Access is limited to this Foundry resource. Credentials were saved only to .env.",
    );
    console.log(
      "Restart the server. Azure role propagation may take a few minutes.",
    );
  } catch (error) {
    // Roll back only the identity and role assignment created by this invocation.
    if (assignment?.id)
      az(["role", "assignment", "delete", "--ids", assignment.id]);
    if (app?.id) az(["ad", "app", "delete", "--id", app.id]);
    const detail =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr).slice(0, 1200)
        : error instanceof Error
          ? error.message
          : "Unknown error";
    throw new Error(`Foundry setup failed during ${stage}: ${detail}`);
  }
}

try {
  setup();
} catch (error) {
  // Azure CLI exception objects may contain captured secrets; never print the object.
  console.error(
    error instanceof Error && !("stdout" in error)
      ? error.message
      : "Azure CLI failed. Check az login, the selected subscription and resource permissions.",
  );
  process.exitCode = 1;
}
