import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async getVideoDetails(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
        },
      },
    });

    if (!video) {
      throw new NotFoundException("Video not found.");
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
}
