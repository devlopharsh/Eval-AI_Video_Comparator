import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type TranscriptApiSegment = {
  text?: string;
  start?: number;
  duration?: number;
};

type TranscriptApiResponse = {
  video_id?: string;
  language?: string;
  transcript?: TranscriptApiSegment[] | string;
  metadata?: {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
  };
  error?: string;
  message?: string;
};

@Injectable()
export class TranscriptApiService {
  private readonly logger = new Logger(TranscriptApiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("transcriptApi.apiKey") ?? "";
    this.baseUrl = this.configService.get<string>("transcriptApi.baseUrl") ?? "https://transcriptapi.com/api/v2";
  }

  isConfigured() {
    return this.apiKey.trim().length > 0;
  }

  async fetchYoutubeTranscript(videoUrl: string) {
    if (!this.isConfigured()) {
      throw new Error("TranscriptAPI is not configured.");
    }

    const endpoint = new URL("youtube/transcript", this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    endpoint.searchParams.set("video_url", videoUrl);
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("include_timestamp", "true");

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    let payload: TranscriptApiResponse | null = null;
    try {
      payload = (await response.json()) as TranscriptApiResponse;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const providerMessage = payload?.message || payload?.error || `TranscriptAPI request failed with status ${response.status}.`;
      this.logger.error(`TranscriptAPI fetch failed: ${response.status} ${providerMessage}`);

      if (response.status === 401) {
        throw new Error("TranscriptAPI rejected the API key. Verify TRANSCRIPT_API_KEY.");
      }

      if (response.status === 402) {
        throw new Error("TranscriptAPI quota or billing limit was reached. Check the provider dashboard.");
      }

      if (response.status === 404) {
        throw new Error("TranscriptAPI could not find a transcript for this YouTube video.");
      }

      if (response.status === 429) {
        throw new Error("TranscriptAPI rate-limited the request. Retry later.");
      }

      throw new Error(providerMessage);
    }

    const transcriptSegments = Array.isArray(payload?.transcript) ? payload.transcript : null;
    const transcriptText =
      typeof payload?.transcript === "string"
        ? payload.transcript
        : transcriptSegments
            ?.map((segment) => segment.text?.trim() ?? "")
            .filter((segment) => segment.length > 0)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim() ?? "";

    if (transcriptText.length <= 80) {
      throw new Error("TranscriptAPI returned insufficient transcript text for this video.");
    }

    return {
      transcript: transcriptText,
      language: payload?.language ?? "en",
      segments:
        transcriptSegments?.map((segment) => ({
          text: segment.text?.trim() ?? "",
          start: segment.start ?? 0,
          duration: segment.duration ?? 0,
        })) ?? [],
    };
  }
}
