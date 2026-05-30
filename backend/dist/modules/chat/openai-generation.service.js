"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OpenAiGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let OpenAiGenerationService = OpenAiGenerationService_1 = class OpenAiGenerationService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OpenAiGenerationService_1.name);
        this.apiKey = this.configService.get("openai.apiKey") ?? "";
        this.baseUrl = this.configService.get("openai.baseUrl") ?? "https://api.openai.com/v1";
        this.chatModel = this.configService.get("openai.chatModel") ?? "gpt-4o-mini";
    }
    getModel() {
        return this.chatModel;
    }
    async generate(input) {
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
            const payload = (await response.json());
            const content = payload.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error("Chat generation returned an empty response.");
            }
            return content;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`OpenAI generation request failed: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
    }
    buildMessages(input) {
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
};
exports.OpenAiGenerationService = OpenAiGenerationService;
exports.OpenAiGenerationService = OpenAiGenerationService = OpenAiGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAiGenerationService);
