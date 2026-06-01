import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageRole, SessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ChatWorkflowService } from "./chat-workflow.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatWorkflowService: ChatWorkflowService,
  ) {}

  async *streamResponse(sessionId: string, message: string) {
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
      throw new NotFoundException("Session not found.");
    }

    if (session.status !== SessionStatus.READY) {
      throw new NotFoundException("Session is not ready for chat yet.");
    }

    const answer = await this.chatWorkflowService.runComparisonWorkflow(
      session.id,
      session.messages.map((entry) => ({
        role: entry.role === MessageRole.USER ? "user" : "assistant",
        content: entry.content,
      })),
      session.videos.map((video) => ({
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
      })),
      message,
    );

    await this.prisma.chatMessage.createMany({
      data: [
        { sessionId, role: MessageRole.USER, content: message },
        { sessionId, role: MessageRole.ASSISTANT, content: answer.message },
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
}
