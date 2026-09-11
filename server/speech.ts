import { z } from "zod";

export const speechRequest = z.object({
  text: z
    .string()
    .max(20000)
    .refine((text) => text.trim().length > 0),
});

const alignmentSchema = z.object({
  characters: z.array(z.string().min(1)),
  character_start_times_seconds: z.array(z.number().nonnegative()),
  character_end_times_seconds: z.array(z.number().nonnegative()),
});
const speechResponse = z.object({
  audio_base64: z.string().min(1),
  alignment: alignmentSchema,
});

export class SpeechError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

function wordTimings(text: string, alignment: z.infer<typeof alignmentSchema>) {
  const {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  } = alignment;
  if (
    characters.join("") !== text ||
    starts.length !== characters.length ||
    ends.length !== characters.length ||
    starts.some(
      (start, index) =>
        start > ends[index] || (index > 0 && start < starts[index - 1]),
    )
  )
    throw new SpeechError(
      "ElevenLabs returned invalid speech timing. Please try again.",
    );

  // DOM Range offsets use UTF-16, while alignment characters may include emoji.
  const characterAt: number[] = [];
  characters.forEach((character, index) => {
    for (let offset = 0; offset < character.length; offset++)
      characterAt.push(index);
  });
  return Array.from(text.matchAll(/\S+/g), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    startTime: starts[characterAt[match.index]],
    endTime: ends[characterAt[match.index + match[0].length - 1]],
  }));
}

export async function createSpeech(text: string, signal: AbortSignal) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key)
    throw new SpeechError(
      "Read aloud needs an ElevenLabs API key on the server.",
      503,
    );
  const voice = process.env.ELEVENLABS_VOICE_ID || "GQrtVlpzdyQgC8wasmeY";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": key },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
      redirect: "error",
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new SpeechError(
        "ElevenLabs access was rejected. Check the server key and its Text to Speech permission.",
        503,
      );
    if (response.status === 429)
      throw new SpeechError(
        "ElevenLabs is busy or its usage limit has been reached. Please try again later.",
        429,
      );
    throw new SpeechError(
      "Could not generate audio with ElevenLabs. Please try again.",
    );
  }
  const parsed = speechResponse.safeParse(await response.json());
  if (!parsed.success)
    throw new SpeechError(
      "ElevenLabs returned audio without valid timing. Please try again.",
    );
  return {
    audioBase64: parsed.data.audio_base64,
    words: wordTimings(text, parsed.data.alignment),
  };
}
