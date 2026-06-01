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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const chat_workflow_service_1 = require("./chat-workflow.service");
let ChatService = class ChatService {
    constructor(prisma, chatWorkflowService) {
        this.prisma = prisma;
        this.chatWorkflowService = chatWorkflowService;
    }
    async *streamResponse(sessionId, message) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                videos: {
                    include: {
                        chunks: true,
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException("Session not found.");
        }
        if (session.status !== client_1.SessionStatus.READY) {
            throw new common_1.NotFoundException("Session is not ready for chat yet.");
        }
        const answer = await this.chatWorkflowService.runComparisonWorkflow(session.id, session.messages.map((entry) => ({
            role: entry.role === client_1.MessageRole.USER ? "user" : "assistant",
            content: entry.content,
        })), session.videos.map((video) => ({
            side: video.side,
            platform: video.platform,
            title: video.title,
            engagementRate: Number(video.engagementRate),
            creator: video.creator,
            followerCount: video.followerCount,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            uploadDate: video.uploadDate,
            durationSeconds: video.durationSeconds,
            hashtags: video.hashtags,
            transcriptSummary: video.transcriptSummary,
            chunks: video.chunks,
        })), message);
        await this.prisma.chatMessage.createMany({
            data: [
                { sessionId, role: client_1.MessageRole.USER, content: message },
                { sessionId, role: client_1.MessageRole.ASSISTANT, content: answer.message },
            ],
        });
        const tokens = answer.message.split(" ");
        for (const token of tokens) {
            yield {
                event: "token",
                data: { token: `${token} ` },
            };
            await new Promise((resolve) => setTimeout(resolve, 15));
        }
        yield {
            event: "complete",
            data: answer,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chat_workflow_service_1.ChatWorkflowService])
], ChatService);
