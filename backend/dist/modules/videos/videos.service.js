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
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VideosService = class VideosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getVideoDetails(id) {
        const video = await this.prisma.video.findUnique({
            where: { id },
            include: {
                chunks: {
                    orderBy: { chunkIndex: "asc" },
                },
            },
        });
        if (!video) {
            throw new common_1.NotFoundException("Video not found.");
        }
        return {
            id: video.id,
            side: video.side,
            platform: video.platform,
            title: video.title,
            creator: video.creator,
            metrics: {
                views: video.views,
                likes: video.likes,
                comments: video.comments,
                engagement_rate: Number(video.engagementRate),
            },
            upload_date: video.uploadDate,
            duration_seconds: video.durationSeconds,
            transcript: video.transcript,
            transcript_summary: video.transcriptSummary,
            hashtags: video.hashtags,
            thumbnail: video.thumbnailUrl,
            citations: video.chunks.map((chunk) => ({
                chunk_id: chunk.chunkKey,
                timestamp_start: chunk.timestampStart,
                timestamp_end: chunk.timestampEnd,
            })),
        };
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VideosService);
