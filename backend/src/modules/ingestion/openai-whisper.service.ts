import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFile } from "node:fs/promises";

@Injectable()
export class OpenAiWhisperService {
  private readonly logger = new Logger(OpenAiWhisperService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>("openai.baseUrl") ?? "https://integrate.api.nvidia.com/v1";
  }

  async transcribeAudio(filePath: string) {
    const apiKey = this.configService.get<string>("providers.openAiApiKey");
    if (!apiKey) {
      throw new Error("Transcription provider is not configured. Set OPENAI_API_KEY before ingesting audio-only sources.");
    }

    if (this.baseUrl.includes("integrate.api.nvidia.com")) {
      throw new Error("NVIDIA chat and embeddings are configured, but transcription is not wired to a compatible NVIDIA ASR endpoint in this backend.");
    }

    const bytes = await readFile(filePath);
    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("file", new File([bytes], "audio.mp3", { type: "audio/mpeg" }));

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Whisper transcription failed: ${response.status} ${errorText}`);
      throw new Error(`Whisper transcription failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as { text?: string };
    const transcript = payload.text?.trim();
    if (!transcript) {
      throw new Error("Whisper transcription returned no transcript text.");
    }

    return transcript;
  }
}
