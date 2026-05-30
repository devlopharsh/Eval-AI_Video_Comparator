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
exports.SessionReaderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SessionReaderService = class SessionReaderService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSessionOrThrow(sessionId) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                jobs: {
                    orderBy: { createdAt: "desc" },
                },
                videos: {
                    include: {
                        chunks: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException("Session not found.");
        }
        const latestJob = session.jobs[0] ?? null;
        const steps = {
            validation: "ready",
            metadata: session.videos.length > 0 ? "ready" : session.status === "FAILED" ? "failed" : "pending",
            transcript: session.videos.some((video) => video.transcript.length > 0)
                ? "ready"
                : session.status === "FAILED"
                    ? "failed"
                    : "pending",
            vector_store: session.videos.some((video) => video.chunks.length > 0)
                ? "ready"
                : session.status === "FAILED"
                    ? "failed"
                    : "pending",
        };
        return {
            id: session.id,
            status: session.status,
            failureReason: session.failureReason,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            latestJob,
            pipeline: steps,
            videos: session.videos.map((video) => ({
                id: video.id,
                side: video.side,
                platform: video.platform,
                title: video.title,
                creator: video.creator,
            })),
            messages: session.messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
            })),
        };
    }
};
exports.SessionReaderService = SessionReaderService;
exports.SessionReaderService = SessionReaderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionReaderService);
