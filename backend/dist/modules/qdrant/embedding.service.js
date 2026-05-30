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
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmbeddingService_1.name);
        this.apiKey = this.configService.get("openai.apiKey") ?? "";
        this.model = this.configService.get("openai.embeddingModel") ?? "nvidia/nv-embedqa-e5-v5";
        this.baseUrl = this.configService.get("openai.baseUrl") ?? "https://integrate.api.nvidia.com/v1";
    }
    async embedDocuments(texts) {
        return this.embedWithMode(texts, "passage");
    }
    async embedQuery(text) {
        const [vector] = await this.embedWithMode([text], "query");
        return vector;
    }
    async embedWithMode(texts, inputType) {
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
            const payload = (await response.json());
            return payload.data.map((item) => item.embedding);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`OpenAI embeddings request failed: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
    }
    requiresInputType() {
        return this.baseUrl.includes("integrate.api.nvidia.com") || this.model.startsWith("nvidia/");
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmbeddingService);
