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
var TranscriptApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TranscriptApiService = TranscriptApiService_1 = class TranscriptApiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TranscriptApiService_1.name);
        this.apiKey = this.configService.get("transcriptApi.apiKey") ?? "";
        this.baseUrl = this.configService.get("transcriptApi.baseUrl") ?? "https://transcriptapi.com/api/v2";
    }
    isConfigured() {
        return this.apiKey.trim().length > 0;
    }
    async fetchYoutubeTranscript(videoUrl) {
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
        let payload = null;
        try {
            payload = (await response.json());
        }
        catch {
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
        const transcriptText = typeof payload?.transcript === "string"
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
            segments: transcriptSegments?.map((segment) => ({
                text: segment.text?.trim() ?? "",
                start: segment.start ?? 0,
                duration: segment.duration ?? 0,
            })) ?? [],
        };
    }
};
exports.TranscriptApiService = TranscriptApiService;
exports.TranscriptApiService = TranscriptApiService = TranscriptApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TranscriptApiService);
