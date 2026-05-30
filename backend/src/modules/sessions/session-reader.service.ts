import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionOrThrow(sessionId: string) {
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
      throw new NotFoundException("Session not found.");
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
    } as const;

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
}
