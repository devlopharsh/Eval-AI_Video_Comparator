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
var YoutubeProviderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeProviderService = void 0;
const common_1 = require("@nestjs/common");
const ingestion_utils_1 = require("./ingestion.utils");
const transcript_api_service_1 = require("./transcript-api.service");
const youtube_data_api_service_1 = require("./youtube-data-api.service");
let YoutubeProviderService = YoutubeProviderService_1 = class YoutubeProviderService {
    constructor(transcriptApiService, youtubeDataApiService) {
        this.transcriptApiService = transcriptApiService;
        this.youtubeDataApiService = youtubeDataApiService;
        this.logger = new common_1.Logger(YoutubeProviderService_1.name);
    }
    async buildSeed(url, side) {
        const [metadata, transcript] = await Promise.all([this.loadMetadata(url), this.loadTranscript(url)]);
        return {
            side,
            platform: "YOUTUBE",
            sourceUrl: url,
            title: metadata.title,
            creator: metadata.creator,
            followerCount: metadata.followerCount,
            views: metadata.views,
            likes: metadata.likes,
            comments: metadata.comments,
            uploadDate: metadata.uploadDate,
            durationSeconds: metadata.durationSeconds,
            hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : (0, ingestion_utils_1.extractHashtags)(transcript),
            transcript,
            transcriptSummary: (0, ingestion_utils_1.buildSummaryFromTranscript)(transcript),
            thumbnailUrl: metadata.thumbnailUrl,
        };
    }
    async loadMetadata(url) {
        try {
            return await this.youtubeDataApiService.fetchMetadata(url);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`YouTube Data API metadata fetch failed for YouTube: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
    }
    async loadTranscript(url) {
        if (!this.transcriptApiService.isConfigured()) {
            throw new Error("TranscriptAPI is not configured. Set TRANSCRIPT_API_KEY for YouTube transcript ingestion.");
        }
        try {
            const result = await this.transcriptApiService.fetchYoutubeTranscript(url);
            return result.transcript;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`TranscriptAPI transcript fetch failed for YouTube: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
    }
};
exports.YoutubeProviderService = YoutubeProviderService;
exports.YoutubeProviderService = YoutubeProviderService = YoutubeProviderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transcript_api_service_1.TranscriptApiService,
        youtube_data_api_service_1.YoutubeDataApiService])
], YoutubeProviderService);
