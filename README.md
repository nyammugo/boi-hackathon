# Plainly

A small React chatbot that makes answers easier to understand. Ask a question, then click **Simplify** under any answer to get a plain-language version. The original stays in the conversation. Chats are saved in local Postgres and can be reopened from the sidebar.

Click **Read aloud** under a completed answer to listen with the browser's voice. The current passage is highlighted; voices that provide [word boundary events](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event) highlight each word. Older browsers without text-range highlighting highlight the current paragraph. **Stop reading** ends playback. Choosing another answer, sending a message, opening another conversation, or hiding the chat also stops playback. The control is disabled when browser speech is unavailable. No extra API key is required.

The app connects to **https://staging.boi.buildprompt.app** through a server-only session. No login, signup, or account setup is needed in the web app. BOI staging runs Claude Sonnet 5; conversations are saved in local Postgres.

The interface takes its palette from [Bank of Ireland’s website](https://www.bankofireland.com/): blue `#0000ff`, navy `#000066`, sky `#b2dbff` and mint `#00ffc5`. It uses Open Sans for interface text and Fraunces as an open-source alternative to the site's proprietary serif. Theme variables live in `src/styles.css`; the header identifies this as a hackathon prototype.

## Setup — for coding agents and humans

Run these commands from the repository root. Node.js **22.12+** (or 24+) and npm are required, plus either a running local Postgres or Docker with Compose.

```sh
npm ci
npm run setup
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://127.0.0.1:3001**. If Vite selects another port, use the URL printed in its output. Keep the dev process running while using the app.

Open **http://localhost:5173/website** for the Bank of Ireland homepage recreation with a floating **Let’s chat** button. It opens the same live chatbot in a compact window, including Simplify, Stop, Retry and saved conversations. Minimising keeps the chat mounted, so a reply can finish in the background. **Expand** animates the same chat into the full workspace over the website, including conversation history. **Minimise** animates it back into the corner window. Drafts and streaming replies stay intact during both transitions. The website is inactive while expanded; keyboard focus stays inside the chat, and reduced-motion preferences disable the resize animation. Reloading a conversation URL reopens the chat window. On mobile the window fits the screen. Press Escape to return from the expanded view to the small window, or from the small window to the launcher.

The `/website` page is a hackathon recreation. Banking and login links open the official website in a new tab; this app collects no banking login details. Public homepage images are stored in `public/boi`, with their original URLs in that directory's README. The page reuses `App` in embedded mode, with styles scoped in `src/website.css`, and uses the existing server API and local database.

**The agent should complete setup autonomously:**

1. Run `npm ci`; the lockfile is committed.
2. Run `npm run setup`. It uses an existing `DATABASE_URL` from the shell or `.env`. Otherwise, it reuses a reachable native Postgres and creates the dedicated `hackathon_chat` database, or starts the project's Docker database on port 5433. It writes only the missing database configuration to the ignored `.env` and applies the schema. Rerunning setup is safe; existing chats are kept.
3. Reuse `BUILDPROMPT_URL` in `.env` and the ignored `.backend-session.json` if present. On a fresh checkout, run the BOI backend setup below using the existing Azure CLI login. **Never print credentials, copy them into source code, or commit `.env` or the session file.** Direct Foundry access is an optional alternative. Without either integration the app streams clearly labelled canned demo responses, so UI testing does not require credentials. Do not extend expired access without an explicit request.
4. Start `npm run dev` in a persistent terminal/process. Check the URL printed by Vite.
5. Run `curl --fail http://127.0.0.1:3001/api/health`. Expect `database: "connected"`, `mode: "backend"`, and model `boi-staging-prompting-claude-sonnet-5`. Alternative modes are `live` (direct Foundry) and `demo` (canned responses). Backend health checks authenticated model and source APIs. An empty `backend.collections` means staging has no default sources selected; document search is not active for that selection.
6. Open the UI, send a question, wait for an answer, click **Simplify**, and reload. Verify both answers remain and the conversation appears in the sidebar. Try an older answer as well; simplification must target that answer, not simply the latest one.
7. Run only the checks relevant to the files you changed (commands below). If you used `agent-browser`, close that browser session before reporting back. Leave the app running and report its URL and whether it uses live AI or demo mode.

If setup cannot find a database, start the installed local Postgres service or Docker daemon and rerun it. On macOS, `open -a Docker` starts an installed Docker Desktop; wait for `docker info` to succeed before retrying. Do not overwrite an existing `.env`, reset database volumes, or change unrelated database services. If neither Postgres nor Docker is installed, report the missing prerequisite rather than silently substituting another database.

### Manual Docker setup

For an explicit Docker setup instead of auto-detection:

```sh
# Only copy this file if .env does not already exist.
cp -n .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

If the database is still starting, rerun `npm run db:migrate` after `docker compose ps` shows it healthy. Docker's data volume persists across restarts. `docker compose stop` stops the database without deleting its contents.

### Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Local Postgres connection; setup detects/writes this if missing | See `.env.example` for Docker |
| `BUILDPROMPT_URL` | Use BOI staging chat, tools and sources through the backend | Set by backend setup |
| `BUILDPROMPT_COLLECTION_IDS` | Server-only comma-separated collection ID override; no user dropdown | Five investment collections for BOI staging; backend defaults elsewhere |
| `AZURE_AI_ENDPOINT` | Foundry resource URL, without `/anthropic/v1` | Missing configuration enables demo mode |
| `AZURE_AI_DEPLOYMENT` | Sonnet 5 deployment name | `claude-sonnet-5` |
| `AZURE_TENANT_ID` | Tenant for the dedicated application credential | Set by Foundry setup |
| `AZURE_CLIENT_ID` | Dedicated application ID | Set by Foundry setup |
| `AZURE_CLIENT_SECRET` | Server-only application secret | Set by Foundry setup |
| `AZURE_CREDENTIAL_EXPIRES_AT` | UTC expiry; requests fail closed at/after this time | Set to 24 hours by Foundry setup |
| `DEMO_MODE` | Set `true` to use sample responses even with credentials | `false` |
| `PORT` | API port; the Vite proxy reads the same setting | `3001` |

Credentials stay on the server. Backend mode sends conversation text to BOI staging, which uses **Claude Sonnet 5 through Azure Foundry**. Direct mode calls Foundry from this server. `DEMO_MODE=true` overrides both and sends no text to an AI provider. Invalid or expired access produces a visible error; the app does not silently switch to demo mode. Restart the server after changing environment variables.

### BOI backend setup (preferred)

The integration follows the authenticated `/api/chat` and tRPC APIs in `buildprompt-monorepo` (`../buildprompt-monorepo` in a normal sibling checkout). On the development machine the reference checkout is `/Users/tomaszpaczuski/Dev/RepCode/buildprompt-monorepo`. It does not require running or modifying that repository.

With authorized Azure staging access:

```sh
az account show --query '{subscription:name,id:id}' -o json
# Expected subscription: 374c6165-b181-4a8d-96c6-33fd7c44e811
npm run setup:backend
npm run dev
```

Setup reads `WORKOS_CLIENT_ID` from `buildprompt-boi-staging-app` and the two WorkOS secrets from Key Vault `bp-boi-stg-kv-df2c77`. It creates a dedicated, verified staging test identity, authenticates it with WorkOS, verifies the protected backend, and saves only its sealed session to `.backend-session.json` with owner-only permissions. It sends no verification email and stores neither the WorkOS API key nor the identity's password. Existing identities and shared credentials are not modified. It refuses to overwrite an existing session.

If Key Vault denies access and temporary grants have been authorized, an agent with role-assignment permission can run this block. It grants read access only to those two secrets and removes its own grants on exit. Do not change the vault's permission model or grant access to the entire vault.

```sh
(
  set -eu
  principal=$(az ad signed-in-user show --query id -o tsv)
  vault_scope=/subscriptions/374c6165-b181-4a8d-96c6-33fd7c44e811/resourceGroups/buildprompt-boi-staging-rg/providers/Microsoft.KeyVault/vaults/bp-boi-stg-kv-df2c77
  grants=$(mktemp)
  cleanup() {
    while IFS= read -r grant; do
      az role assignment delete --ids "$grant" --only-show-errors
    done < "$grants"
    rm -f "$grants"
  }
  trap cleanup EXIT
  for secret in workos-api-key workos-cookie-password; do
    az role assignment create --assignee-object-id "$principal" \
      --assignee-principal-type User --role 'Key Vault Secrets User' \
      --scope "$vault_scope/secrets/$secret" --query id -o tsv >> "$grants"
  done
  # Allow RBAC to propagate. If lookup is still denied, wait and retry this block.
  sleep 30
  npm run setup:backend
)
```

The server forwards its cookie only to the configured backend, follows no redirects, and saves rotated cookies on authenticated responses. Nothing is placed in browser cookies or client JavaScript. It stops using the session at the existing Foundry credential deadline, or 24 hours after setup when no deadline exists. **This is a local deadline, not a change to WorkOS's session lifetime**; the staging identity remains until deleted. The retained user ID supports later cleanup via WorkOS. Fresh access requires an explicitly authorized new session.

Chat uses staging's model and the five built-in investment collections, unless overridden by `BUILDPROMPT_COLLECTION_IDS`. Other backend environments use their default source selection. It does not create a staging conversation thread: conversation history remains in the local database. The sidebar reports selected source counts. At initial verification staging had source collections but no default selection, so ordinary document search was inactive. The server can select existing collections for every request; the app does not change staging-wide source defaults. Local uploads are not implemented.

### Investment demo sources

The demo uses five fixed server-side collections on `https://staging.boi.buildprompt.app`: Emerald master terms, Emerald disclosures, the fictional range master catalogue, its risk/cost register, and reviewed New Ireland public documents (14 files). These collections are built into the adapter for BOI staging, so no additional configuration or source dropdown is needed. The equivalent optional override in the ignored `.env` is:

```dotenv
BUILDPROMPT_COLLECTION_IDS=35cb7d83-a92c-447f-953c-060a243d9062,15772165-59d3-4fa1-92bf-c7750d0363c9,c6efc7d7-bab8-43d7-8608-8df51115e1d0,a4f102aa-b2a8-4ea5-9569-628265e0807b,f215a321-d5fd-4134-86e1-69323799de16
```

The health endpoint and sidebar report the selected collections. Requests pass these IDs through BuildPrompt's existing `sourceSelection` contract. Other staging collections and shared defaults are unaffected. An unknown configured collection produces a health error.

### In-chat citations

Answers using BuildPrompt footnotes (`[^1]` plus `[^1]: filename | p. 2 | excerpt`) display numbered badges and a Sources section. Select a badge or source card to reveal its excerpt and page label. Open document reads the actual file through the server-only staging session. This also works for existing saved chats. Document names must match exactly one ready file in the preselected collections; otherwise the card shows that its document link is unavailable. The excerpt remains model-supplied text, not an independently verified quotation.

The server lists selected files at `/api/sources` and restricts `/api/sources/:id` to that selection. Backend credentials stay on the server. Markdown tables and footnotes use `remark-gfm` with the existing React Markdown renderer. Citation rendering checks run with `npm run test:citations`.

### In-chat charts

BuildPrompt's `bp-chart` and `buildprompt-chart` blocks now render as responsive Recharts visuals, using the same six types as BuildPrompt: line, area, bar, pie, donut and scatter. A JSON code block is also rendered when it contains a valid chart specification. Titles, descriptions, labels and values come from the supplied chart data; hover shows values, and View chart data exposes an accessible table. Existing saved answers render without regeneration.

Incomplete chart blocks show Preparing chart while streaming. Invalid or unsupported chart specifications show a fallback with the original data. Validation rejects missing values, invalid numeric cells and oversized series rather than silently discarding rows. Citations remain connected across charts. Run `npm run test:charts` for these cases.

### Direct Foundry setup with 24-hour access (optional)

This alternative is used when `BUILDPROMPT_URL` is empty. It is not required for backend mode.

The confirmed resource is `buildprompt-boi-staging-foundry` in resource group `buildprompt-boi-staging-rg`, using deployment `boi-staging-prompting-claude-sonnet-5`. Use the existing `az` CLI login and subscription `374c6165-b181-4a8d-96c6-33fd7c44e811`. This is server authentication; **users of the web app never log in**.

When explicitly authorized to create temporary cloud credentials, run:

```sh
az account show --query '{subscription:name,id:id}' -o json
npm run setup:foundry -- \
  --resource buildprompt-boi-staging-foundry \
  --resource-group buildprompt-boi-staging-rg \
  --deployment boi-staging-prompting-claude-sonnet-5
```

The command verifies the deployed model is Sonnet 5, creates a dedicated Entra application/service principal, grants `Cognitive Services User` **only on this Foundry resource**, and creates an application secret with an explicit expiry 24 hours later. It verifies Azure's recorded expiry and writes the credentials only to ignored `.env` with owner-only permissions. It never reads or rotates shared resource keys. Run it only once: it refuses to overwrite existing application credentials.

Foundry's standard resource keys are static, so the expiring credential is an **Entra client secret**, not a resource API key. Azure stops issuing tokens for that secret after expiry. The app additionally refuses requests at expiry so cached tokens cannot extend its use. Existing Entra access tokens can remain valid until their own expiry outside this app. The application identity and role assignment remain after the secret expires; they can be removed using the application ID printed during setup.

The setup requires permission to register Entra applications and assign a role on the resource. It rolls back its own identity and role assignment if provisioning fails. Azure role assignments can take a few minutes to propagate; a temporary 403 immediately after setup can be retried. A missing Azure login or missing permission should be reported clearly, without falling back to a different resource or issuing a permanent key.

Reference: [Claude on Foundry](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-claude), [Foundry authentication](https://learn.microsoft.com/en-us/azure/foundry/concepts/authentication-authorization-foundry?view=foundry-classic).

## Checks

Use small, explicit scopes. Do not run a full-project typecheck or unscoped test command.

```sh
# Format/lint only the changed paths; narrow this list for subsequent edits.
npm run check-and-fix -- src server scripts vite.config.ts
npm run dead-code

# Run the relevant component's typecheck, not a root/full-project check.
npm run typecheck:web
npm run typecheck:server

# Chat validation and simplification tests; no services or AI key required.
npm run test:chat
npm run test:model
npm run test:backend

# Read-aloud text segmentation and browser capability tests.
npx tsx --test src/readAloud.test.ts

# API integration tests with canned streaming and real Postgres.
# Requires setup first. Uses temporary UUID conversations and deletes only its own test rows.
npm run test:api

# Build the browser bundle.
npm run build
```

After building, `npm start` serves both the API and built React app on http://127.0.0.1:3001. No separate Vite process is needed for that mode.

## Structure

```text
src/                 React interface, streaming chat, history, Simplify
server/app.ts        Thin Express API and AI SDK streaming
server/chat.ts       Validation, assistant prompt, simplification prompt, demo responses
server/db.ts         Parameterized Postgres queries
server/model.ts      Sonnet 5 on Foundry and credential-expiry enforcement
server/backend.ts    BOI authenticated API adapter and session rotation
server/schema.sql    Conversations and a table reserved for future documents
scripts/setup.mjs    Repeatable local database setup
scripts/setup-foundry.mjs  Explicit provisioning of 24-hour Foundry credentials
scripts/setup-backend.mjs  Dedicated staging identity and server-only session
compose.yaml         Optional local Postgres container
```

React uses AI SDK's `useChat` and `DefaultChatTransport`; Express bridges BOI's UI message stream or uses `streamText` in direct mode. Full conversations are stored as JSONB. Simplify looks up the selected assistant answer in the saved conversation and asks the model to rewrite it without losing facts or caveats. Completed answers are saved before the response closes, so reloading retains them. Backend tool events can stream through, while only text is sent back as conversation history.

Reference: [AI SDK chat and persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence).

## First-pass scope

- Working streamed chat, Markdown answers, Stop, Retry, copy, saved conversation history, and Simplify on any completed answer.
- Responsive interface with an explicit demo-mode label and useful error states.
- BOI staging provides the model and its existing chat tools. Document search automatically uses the five built-in investment demo collections on BOI staging; a server-side override is available. A local `documents` table is reserved for the next pass; local uploads, parsing and retrieval are not implemented. Direct Foundry mode has no document access.
- This is a local, single-workspace hackathon app with no authentication. The server binds to loopback. All local users of this instance share its conversations. Add access control before exposing it beyond your machine.
- The first pass caps requests at 100 messages, 20,000 characters per text part, and 512 KB total. Start a new conversation when you reach a limit. Conversation history shows the latest 50 chats.
