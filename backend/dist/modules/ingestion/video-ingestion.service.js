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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoIngestionService = void 0;
const common_1 = require("@nestjs/common");
const instagram_provider_service_1 = require("./instagram-provider.service");
const youtube_provider_service_1 = require("./youtube-provider.service");
let VideoIngestionService = class VideoIngestionService {
    constructor(youtubeProvider, instagramProvider) {
        this.youtubeProvider = youtubeProvider;
        this.instagramProvider = instagramProvider;
    }
    async buildComparisonPair(videoUrlA, videoUrlB) {
        const [videoA, videoB] = await Promise.all([
            this.buildSeedForUrl(videoUrlA, "A"),
            this.buildSeedForUrl(videoUrlB, "B"),
        ]);
        return [videoA, videoB];
    }
    async buildSeedForUrl(url, side) {
        const hostname = new URL(this.ensureHttps(url)).hostname.toLowerCase();
        if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
            return this.youtubeProvider.buildSeed(url, side);
        }
        if (hostname.includes("instagram.com")) {
            return this.instagramProvider.buildSeed(url, side);
        }
        throw new Error("Only YouTube and Instagram URLs are currently supported.");
    }
    ensureHttps(url) {
        return /^https?:\/\//i.test(url) ? url : `https://${url}`;
    }
};
exports.VideoIngestionService = VideoIngestionService;
exports.VideoIngestionService = VideoIngestionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [youtube_provider_service_1.YoutubeProviderService,
        instagram_provider_service_1.InstagramProviderService])
], VideoIngestionService);
