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
var IngestionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const bullmq_2 = require("bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const qdrant_service_1 = require("../qdrant/qdrant.service");
const ingestion_queue_enum_1 = require("../../shared/enums/ingestion-queue.enum");
const transcript_chunker_service_1 = require("./transcript-chunker.service");
const video_ingestion_service_1 = require("./video-ingestion.service");
let IngestionProcessor = IngestionProcessor_1 = class IngestionProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, chunker, videoIngestionService, qdrantService) {
        super();
        this.prisma = prisma;
        this.chunker = chunker;
        this.videoIngestionService = videoIngestionService;
        this.qdrantService = qdrantService;
        this.logger = new common_1.Logger(IngestionProcessor_1.name);
    }
    async process(job) {
        const { sessionId, videoUrlA, videoUrlB } = job.data;
        this.logger.log(`Starting ingestion job ${job.id?.toString() ?? "unknown"} for session ${sessionId}.`);
        await this.prisma.session.update({
            where: { id: sessionId },
            data: { status: client_1.SessionStatus.PROCESSING, failureReason: null },
        });
        await this.prisma.ingestionJob.updateMany({
            where: { sessionId, queueJobId: job.id?.toString() },
            data: { status: client_1.JobStatus.ACTIVE, failureReason: null },
        });
        try {
            const videos = await this.videoIngestionService.buildComparisonPair(videoUrlA, videoUrlB);
            const qdrantPoints = [];
            for (const video of videos) {
                const engagementRate = this.calculateEngagement(video.likes, video.comments, video.views);
                const savedVideo = await this.prisma.video.upsert({
                    where: {
                        sessionId_side: {
                            sessionId,
                            side: video.side,
                        },
                    },
                    update: {
                        sourceUrl: video.sourceUrl,
                        title: video.title,
                        creator: video.creator,
                        followerCount: video.followerCount,
                        views: video.views,
                        likes: video.likes,
                        comments: video.comments,
                        engagementRate,
                        uploadDate: video.uploadDate,
                        durationSeconds: video.durationSeconds,
                        hashtags: video.hashtags,
                        transcript: video.transcript,
                        transcriptSummary: video.transcriptSummary,
                        thumbnailUrl: video.thumbnailUrl,
                    },
                    create: {
                        sessionId,
                        side: video.side,
                        platform: video.platform,
                        sourceUrl: video.sourceUrl,
                        title: video.title,
                        creator: video.creator,
                        followerCount: video.followerCount,
                        views: video.views,
                        likes: video.likes,
                        comments: video.comments,
                        engagementRate,
                        uploadDate: video.uploadDate,
                        durationSeconds: video.durationSeconds,
                        hashtags: video.hashtags,
                        transcript: video.transcript,
                        transcriptSummary: video.transcriptSummary,
                        thumbnailUrl: video.thumbnailUrl,
                    },
                });
                await this.prisma.transcriptChunk.deleteMany({
                    where: { videoId: savedVideo.id },
                });
                const chunks = await this.chunker.chunkTranscript({
                    videoId: savedVideo.id,
                    side: video.side,
                    creator: video.creator,
                    platform: video.platform,
                    transcript: video.transcript,
                    durationSeconds: video.durationSeconds,
                });
                if (chunks.length > 0) {
                    await this.prisma.transcriptChunk.createMany({
                        data: chunks,
                    });
                    qdrantPoints.push(...chunks.map((chunk) => ({
                        id: (0, node_crypto_1.randomUUID)(),
                        vector: chunk.embedding,
                        payload: {
                            sessionId,
                            videoId: savedVideo.id,
                            side: video.side,
                            platform: video.platform,
                            creator: video.creator,
                            chunkKey: chunk.chunkKey,
                            timestampStart: chunk.timestampStart,
                            timestampEnd: chunk.timestampEnd,
                            text: chunk.text,
                        },
                    })));
                }
            }
            await this.qdrantService.upsertTranscriptChunks(qdrantPoints);
            this.logger.log(`Session ${sessionId} stored ${qdrantPoints.length} chunk vectors in Qdrant.`);
            await this.prisma.ingestionJob.updateMany({
                where: { sessionId, queueJobId: job.id?.toString() },
                data: { status: client_1.JobStatus.COMPLETED },
            });
            await this.prisma.session.update({
                where: { id: sessionId },
                data: { status: client_1.SessionStatus.READY },
            });
            this.logger.log(`Completed ingestion for session ${sessionId}.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown ingestion error.";
            const failureReason = this.normalizeFailureReason(message);
            this.logger.error(message);
            await this.prisma.ingestionJob.updateMany({
                where: { sessionId, queueJobId: job.id?.toString() },
                data: {
                    status: client_1.JobStatus.FAILED,
                    failureReason,
                },
            });
            await this.prisma.session.update({
                where: { id: sessionId },
                data: {
                    status: client_1.SessionStatus.FAILED,
                    failureReason,
                },
            });
            if (this.isUnrecoverableFailure(message)) {
                throw new bullmq_2.UnrecoverableError(failureReason);
            }
            throw error;
        }
    }
    calculateEngagement(likes, comments, views) {
        if (views <= 0) {
            return 0;
        }
        return Number((((likes + comments) / views) * 100).toFixed(2));
    }
    isUnrecoverableFailure(message) {
        return (message.includes("HTTP 429") ||
            message.includes("rate-limited") ||
            message.includes("yt-dlp is required") ||
            message.includes("Embedding provider is not configured") ||
            message.includes("Chat generation provider is not configured") ||
            message.includes("Transcription provider is not configured"));
    }
    normalizeFailureReason(message) {
        if (message.includes("HTTP 429") || message.includes("rate-limited")) {
            return "YouTube rate-limited subtitle retrieval for this video. Retry later, use a different network, or test another URL.";
        }
        if (message.includes("yt-dlp is required")) {
            return "yt-dlp is not available to the backend process. Install it and ensure it is on PATH.";
        }
        if (message.includes("Embedding provider is not configured")) {
            return "Embeddings are not configured. Set OPENAI_API_KEY before running ingestion.";
        }
        if (message.includes("Chat generation provider is not configured")) {
            return "Chat generation is not configured. Set OPENAI_API_KEY before using analysis chat.";
        }
        if (message.includes("Transcription provider is not configured")) {
            return "Audio transcription is not configured for this backend. Configure a supported transcription provider.";
        }
        return message;
    }
};
exports.IngestionProcessor = IngestionProcessor;
exports.IngestionProcessor = IngestionProcessor = IngestionProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(ingestion_queue_enum_1.INGESTION_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        transcript_chunker_service_1.TranscriptChunkerService,
        video_ingestion_service_1.VideoIngestionService,
        qdrant_service_1.QdrantService])
], IngestionProcessor);
