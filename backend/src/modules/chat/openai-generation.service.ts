import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Citation, ConversationTurn } from "./chat.types";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GenerationInput = {
  model: string;
  route: "metadata" | "retrieval";
  question: string;
  conversation: ConversationTurn[];
  metadataContext: string;
  retrievedContext: string;
  citations: Citation[];
};

@Injectable()
export class OpenAiGenerationService {
  private readonly logger = new Logger(OpenAiGenerationService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly chatModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("openai.apiKey") ?? "";
    this.baseUrl = this.configService.get<string>("openai.baseUrl") ?? "https://api.openai.com/v1";
    this.chatModel = this.configService.get<string>("openai.chatModel") ?? "gpt-4o-mini";
  }

  getModel() {
    return this.chatModel;
  }

  async generate(input: GenerationInput) {
    if (!this.apiKey) {
      throw new Error("Chat generation provider is not configured. Set OPENAI_API_KEY before using chat.");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: input.model,
          temperature: 0.2,
          messages: this.buildMessages(input),
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(`OpenAI generation failed: ${detail}`);
        throw new Error(`Chat generation failed: ${detail}`);
      }

      const payload = (await response.json()) as OpenAiChatResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Chat generation returned an empty response.");
      }

      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`OpenAI generation request failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private buildMessages(input: GenerationInput) {
    const system = [
      "You are an analyst comparing two social media videos.",
      "Answer only from the supplied metadata and retrieved transcript evidence.",
      "Be concise, specific, and evidence-grounded.",
      "If evidence is limited, say so directly instead of inventing details.",
      "Do not add a citations section in the answer because citations are returned separately by the application.",
    ].join(" ");

    const history = input.conversation.slice(-6).map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));

    const user = [
      `Route: ${input.route}`,
      "Question:",
      input.question,
      "",
      "Metadata context:",
      input.metadataContext || "No metadata context available.",
      "",
      "Retrieved transcript context:",
      input.retrievedContext || "No transcript context was retrieved.",
      "",
      "Available citations:",
      input.citations.length > 0
        ? input.citations
            .map((citation) => `${citation.source} | ${citation.chunkId} | ${citation.timestamp}`)
            .join("\n")
        : "No citations available.",
    ].join("\n");

    return [
      { role: "system", content: system },
      ...history,
      { role: "user", content: user },
    ];
  }
}
