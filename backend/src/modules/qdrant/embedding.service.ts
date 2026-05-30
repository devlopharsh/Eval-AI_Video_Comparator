import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type OpenAiEmbeddingResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("openai.apiKey") ?? "";
    this.model = this.configService.get<string>("openai.embeddingModel") ?? "nvidia/nv-embedqa-e5-v5";
    this.baseUrl = this.configService.get<string>("openai.baseUrl") ?? "https://integrate.api.nvidia.com/v1";
  }

  async embedDocuments(texts: string[]) {
    return this.embedWithMode(texts, "passage");
  }

  async embedQuery(text: string) {
    const [vector] = await this.embedWithMode([text], "query");
    return vector;
  }

  private async embedWithMode(texts: string[], inputType: "passage" | "query") {
    if (texts.length === 0) {
      return [];
    }

    if (!this.apiKey) {
      throw new Error("Embedding provider is not configured. Set OPENAI_API_KEY before ingestion or retrieval.");
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          encoding_format: "float",
          ...(this.requiresInputType() ? { input_type: inputType } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(`OpenAI embeddings failed: ${detail}`);
        throw new Error(`Embedding request failed: ${detail}`);
      }

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
      return payload.data.map((item) => item.embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`OpenAI embeddings request failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private requiresInputType() {
    return this.baseUrl.includes("integrate.api.nvidia.com") || this.model.startsWith("nvidia/");
  }
}
