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
var OpenAiWhisperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiWhisperService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const promises_1 = require("node:fs/promises");
let OpenAiWhisperService = OpenAiWhisperService_1 = class OpenAiWhisperService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OpenAiWhisperService_1.name);
        this.baseUrl = this.configService.get("openai.baseUrl") ?? "https://integrate.api.nvidia.com/v1";
    }
    async transcribeAudio(filePath) {
        const apiKey = this.configService.get("providers.openAiApiKey");
        if (!apiKey) {
            throw new Error("Transcription provider is not configured. Set OPENAI_API_KEY before ingesting audio-only sources.");
        }
        if (this.baseUrl.includes("integrate.api.nvidia.com")) {
            throw new Error("NVIDIA chat and embeddings are configured, but transcription is not wired to a compatible NVIDIA ASR endpoint in this backend.");
        }
        const bytes = await (0, promises_1.readFile)(filePath);
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
        const payload = (await response.json());
        const transcript = payload.text?.trim();
        if (!transcript) {
            throw new Error("Whisper transcription returned no transcript text.");
        }
        return transcript;
    }
};
exports.OpenAiWhisperService = OpenAiWhisperService;
exports.OpenAiWhisperService = OpenAiWhisperService = OpenAiWhisperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAiWhisperService);
