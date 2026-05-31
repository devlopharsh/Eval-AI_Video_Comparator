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
var YoutubeDataApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeDataApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ingestion_utils_1 = require("./ingestion.utils");
let YoutubeDataApiService = YoutubeDataApiService_1 = class YoutubeDataApiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YoutubeDataApiService_1.name);
        this.apiKey = this.configService.get("youtubeDataApi.apiKey") ?? "";
        this.baseUrl = this.configService.get("youtubeDataApi.baseUrl") ?? "https://www.googleapis.com/youtube/v3";
    }
    async fetchMetadata(videoUrl) {
        if (!this.apiKey.trim()) {
            throw new Error("YouTube Data API is not configured. Set YOUTUBE_DATA_API_KEY.");
        }
        const videoId = this.extractVideoId(videoUrl);
        const video = await this.fetchVideo(videoId);
        const snippet = video.snippet;
        const channelId = snippet?.channelId;
        if (!snippet?.title || !snippet.channelTitle || !snippet.publishedAt || !channelId) {
            throw new Error("YouTube Data API returned incomplete video metadata.");
        }
        const followerCount = await this.fetchSubscriberCount(channelId);
        const description = snippet.description ?? "";
        const tags = snippet.tags ?? [];
        return {
            title: snippet.title,
            creator: snippet.channelTitle,
            thumbnailUrl: this.pickThumbnail(snippet.thumbnails),
            durationSeconds: this.parseIsoDuration(video.contentDetails?.duration),
            uploadDate: new Date(snippet.publishedAt),
            followerCount,
            views: Number(video.statistics?.viewCount ?? 0),
            likes: Number(video.statistics?.likeCount ?? 0),
            comments: Number(video.statistics?.commentCount ?? 0),
            hashtags: this.buildHashtags(tags, description),
        };
    }
    async fetchVideo(videoId) {
        const endpoint = new URL("videos", this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
        endpoint.searchParams.set("part", "snippet,contentDetails,statistics");
        endpoint.searchParams.set("id", videoId);
        endpoint.searchParams.set("key", this.apiKey);
        const response = await fetch(endpoint);
        const payload = (await response.json());
        if (!response.ok || payload.error) {
            const message = payload.error?.message || `YouTube Data API videos.list failed with status ${response.status}.`;
            this.logger.error(`YouTube Data API video lookup failed: ${message}`);
            if (response.status === 403) {
                throw new Error("YouTube Data API rejected the request. Check API key validity, quota, and API enablement.");
            }
            throw new Error(message);
        }
        const item = payload.items?.[0];
        if (!item) {
            throw new Error("YouTube Data API could not find the requested video.");
        }
        return item;
    }
    async fetchSubscriberCount(channelId) {
        const endpoint = new URL("channels", this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
        endpoint.searchParams.set("part", "statistics");
        endpoint.searchParams.set("id", channelId);
        endpoint.searchParams.set("key", this.apiKey);
        const response = await fetch(endpoint);
        const payload = (await response.json());
        if (!response.ok || payload.error) {
            const message = payload.error?.message || `YouTube Data API channels.list failed with status ${response.status}.`;
            this.logger.error(`YouTube Data API channel lookup failed: ${message}`);
            if (response.status === 403) {
                throw new Error("YouTube Data API channel lookup was rejected. Check API key validity and quota.");
            }
            throw new Error(message);
        }
        return Number(payload.items?.[0]?.statistics?.subscriberCount ?? 0);
    }
    extractVideoId(url) {
        let parsed;
        try {
            parsed = new URL(url);
        }
        catch {
            throw new Error("Invalid YouTube URL.");
        }
        if (parsed.hostname === "youtu.be") {
            const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
            if (id) {
                return id;
            }
        }
        const watchId = parsed.searchParams.get("v");
        if (watchId) {
            return watchId;
        }
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        const shortsIndex = pathParts.indexOf("shorts");
        if (shortsIndex >= 0 && pathParts[shortsIndex + 1]) {
            return pathParts[shortsIndex + 1];
        }
        const embedIndex = pathParts.indexOf("embed");
        if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
            return pathParts[embedIndex + 1];
        }
        throw new Error("Unable to extract the YouTube video ID from the provided URL.");
    }
    pickThumbnail(thumbnails) {
        const value = thumbnails?.maxres?.url ??
            thumbnails?.standard?.url ??
            thumbnails?.high?.url ??
            thumbnails?.medium?.url ??
            thumbnails?.default?.url;
        if (!value) {
            throw new Error("YouTube Data API did not return a thumbnail for this video.");
        }
        return value;
    }
    parseIsoDuration(input) {
        if (!input) {
            return 0;
        }
        const match = input.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
        if (!match) {
            return 0;
        }
        const hours = Number(match[1] ?? 0);
        const minutes = Number(match[2] ?? 0);
        const seconds = Number(match[3] ?? 0);
        return hours * 3600 + minutes * 60 + seconds;
    }
    buildHashtags(tags, description) {
        const normalizedTags = tags
            .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
            .filter((tag) => tag.length > 0);
        return [...new Set([...normalizedTags, ...(0, ingestion_utils_1.extractHashtags)(description)])];
    }
};
exports.YoutubeDataApiService = YoutubeDataApiService;
exports.YoutubeDataApiService = YoutubeDataApiService = YoutubeDataApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YoutubeDataApiService);
