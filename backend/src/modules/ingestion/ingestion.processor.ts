import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Job, UnrecoverableError } from "bullmq";
import { JobStatus, SessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QdrantService } from "../qdrant/qdrant.service";
import { INGESTION_QUEUE } from "../../shared/enums/ingestion-queue.enum";
import type { IngestionPayload } from "../../shared/types/ingestion.types";
import { TranscriptChunkerService } from "./transcript-chunker.service";
import { VideoIngestionService } from "./video-ingestion.service";

@Injectable()
@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: TranscriptChunkerService,
    private readonly videoIngestionService: VideoIngestionService,
    private readonly qdrantService: QdrantService,
  ) {
    super();
  }

  async process(job: Job<IngestionPayload>) {
    const { sessionId, videoUrlA, videoUrlB } = job.data;
    this.logger.log(`Starting ingestion job ${job.id?.toString() ?? "unknown"} for session ${sessionId}.`);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PROCESSING, failureReason: null },
    });

    await this.prisma.ingestionJob.updateMany({
      where: { sessionId, queueJobId: job.id?.toString() },
      data: { status: JobStatus.ACTIVE, failureReason: null },
    });

    try {
      const videos = await this.videoIngestionService.buildComparisonPair(videoUrlA, videoUrlB);
      const qdrantPoints: Array<{
        id: string;
        vector: number[];
        payload: {
          sessionId: string;
          videoId: string;
          side: "A" | "B";
          platform: string;
          creator: string;
          chunkKey: string;
          timestampStart: number;
          timestampEnd: number;
          text: string;
        };
      }> = [];

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

          qdrantPoints.push(
            ...chunks.map((chunk) => ({
              id: randomUUID(),
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
            })),
          );
        }
      }

      await this.qdrantService.upsertTranscriptChunks(qdrantPoints);
      this.logger.log(`Session ${sessionId} stored ${qdrantPoints.length} chunk vectors in Qdrant.`);

      await this.prisma.ingestionJob.updateMany({
        where: { sessionId, queueJobId: job.id?.toString() },
        data: { status: JobStatus.COMPLETED },
      });

      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.READY },
      });
      this.logger.log(`Completed ingestion for session ${sessionId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ingestion error.";
      const failureReason = this.normalizeFailureReason(message);
      this.logger.error(message);

      await this.prisma.ingestionJob.updateMany({
        where: { sessionId, queueJobId: job.id?.toString() },
        data: {
          status: JobStatus.FAILED,
          failureReason,
        },
      });

      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.FAILED,
          failureReason,
        },
      });

      if (this.isUnrecoverableFailure(message)) {
        throw new UnrecoverableError(failureReason);
      }

      throw error;
    }
  }

  private calculateEngagement(likes: number, comments: number, views: number) {
    if (views <= 0) {
      return 0;
    }

    return Number((((likes + comments) / views) * 100).toFixed(2));
  }

  private isUnrecoverableFailure(message: string) {
    return (
      message.includes("HTTP 429") ||
      message.includes("rate-limited") ||
      message.includes("blocked anonymous") ||
      message.includes("not a bot") ||
      message.includes("yt-dlp is required") ||
      message.includes("Embedding provider is not configured") ||
      message.includes("Chat generation provider is not configured") ||
      message.includes("Transcription provider is not configured")
    );
  }

  private normalizeFailureReason(message: string) {
    if (message.includes("HTTP 429") || message.includes("rate-limited")) {
      return "YouTube rate-limited subtitle retrieval for this video. Retry later, use a different network, or test another URL.";
    }

    if (message.includes("blocked anonymous") || message.includes("not a bot")) {
      return "YouTube blocked anonymous access for this video. Provide yt-dlp cookies or test a different video/network.";
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
}
