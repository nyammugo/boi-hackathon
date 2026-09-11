import "dotenv/config";
import { z } from "zod";

export class VoiceError extends Error {}

export class ElevenLabsAgent {
  constructor(
    private apiKey = process.env.ELEVENLABS_API_KEY,
    private agentId = process.env.ELEVENLABS_AGENT_ID,
    private request = fetch,
  ) {}

  private async get(path: string, signal?: AbortSignal) {
    if (!this.apiKey || !this.agentId)
      throw new VoiceError(
        "Voice calls are not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the server.",
      );
    const response = await this.request(
      `https://api.elevenlabs.io/v1/convai/${path}`,
      {
        headers: { "xi-api-key": this.apiKey },
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new VoiceError(
        response.status === 401 || response.status === 403
          ? "ElevenLabs rejected the server key. Check its agent permissions."
          : `Could not connect to the voice agent (HTTP ${response.status}). Please try again.`,
      );
    }
    return response.json();
  }

  async info() {
    const data = z
      .object({
        name: z.string(),
        conversation_config: z.object({
          agent: z.object({
            prompt: z.object({ llm: z.string().nullable().optional() }),
          }),
        }),
      })
      .parse(
        await this.get(`agents/${encodeURIComponent(this.agentId || "")}`),
      );
    return {
      available: true,
      name: data.name,
      model: data.conversation_config.agent.prompt.llm || "Custom model",
    };
  }

  async signedUrl(signal: AbortSignal) {
    const data = z
      .object({ signed_url: z.url() })
      .parse(
        await this.get(
          `conversation/get-signed-url?agent_id=${encodeURIComponent(this.agentId || "")}`,
          signal,
        ),
      );
    const url = new URL(data.signed_url);
    if (url.protocol !== "wss:" || url.hostname !== "api.elevenlabs.io")
      throw new VoiceError(
        "The voice service returned an invalid connection URL.",
      );
    return data.signed_url;
  }
}
