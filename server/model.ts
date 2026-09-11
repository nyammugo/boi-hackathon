import "dotenv/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { ClientSecretCredential } from "@azure/identity";

export const modelName = process.env.AZURE_AI_DEPLOYMENT || "claude-sonnet-5";
const hasFoundryConfig = Boolean(
  process.env.AZURE_AI_ENDPOINT &&
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET,
);
export const demoMode = process.env.DEMO_MODE === "true" || !hasFoundryConfig;
let credential: ClientSecretCredential | undefined;

export function accessExpired(expiresAt: string | undefined, now = Date.now()) {
  const expiry = Date.parse(expiresAt || "");
  return !Number.isFinite(expiry) || now >= expiry;
}

export async function getModel() {
  if (accessExpired(process.env.AZURE_CREDENTIAL_EXPIRES_AT)) {
    throw new Error(
      "Temporary AI access has expired. Renew the Foundry credential and restart the server.",
    );
  }
  if (!hasFoundryConfig)
    throw new Error(
      "Foundry is not configured. Run the setup instructions in README.md.",
    );
  credential ??= new ClientSecretCredential(
    process.env.AZURE_TENANT_ID || "",
    process.env.AZURE_CLIENT_ID || "",
    process.env.AZURE_CLIENT_SECRET || "",
  );
  const token = await credential.getToken("https://ai.azure.com/.default");
  return createAnthropic({
    baseURL: `${process.env.AZURE_AI_ENDPOINT?.replace(/\/$/, "")}/anthropic/v1`,
    authToken: token.token,
  })(modelName);
}
