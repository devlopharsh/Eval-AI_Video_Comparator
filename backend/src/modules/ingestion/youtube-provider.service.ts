import { Injectable, Logger } from "@nestjs/common";
import { buildSummaryFromTranscript, extractHashtags } from "./ingestion.utils";
import { TranscriptApiService } from "./transcript-api.service";
import { YoutubeDataApiService } from "./youtube-data-api.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";

@Injectable()
export class YoutubeProviderService {
  private readonly logger = new Logger(YoutubeProviderService.name);

  constructor(
    private readonly transcriptApiService: TranscriptApiService,
    private readonly youtubeDataApiService: YoutubeDataApiService,
  ) {}

  async buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed> {
    const [metadata, transcript] = await Promise.all([this.loadMetadata(url), this.loadTranscript(url)]);

    return {
      side,
      platform: "YOUTUBE",
      sourceUrl: url,
      title: metadata.title,
      creator: metadata.creator,
      followerCount: metadata.followerCount,
      views: metadata.views,
      likes: metadata.likes,
      comments: metadata.comments,
      uploadDate: metadata.uploadDate,
      durationSeconds: metadata.durationSeconds,
      hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : extractHashtags(transcript),
      transcript,
      transcriptSummary: buildSummaryFromTranscript(transcript),
      thumbnailUrl: metadata.thumbnailUrl,
    };
  }

  private async loadMetadata(url: string) {
    try {
      return await this.youtubeDataApiService.fetchMetadata(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`YouTube Data API metadata fetch failed for YouTube: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async loadTranscript(url: string) {
    if (!this.transcriptApiService.isConfigured()) {
      throw new Error("TranscriptAPI is not configured. Set TRANSCRIPT_API_KEY for YouTube transcript ingestion.");
    }

    try {
      const result = await this.transcriptApiService.fetchYoutubeTranscript(url);
      return result.transcript;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`TranscriptAPI transcript fetch failed for YouTube: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
