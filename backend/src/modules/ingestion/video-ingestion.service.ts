import { Injectable } from "@nestjs/common";
import type { VideoSeed } from "../../shared/types/ingestion.types";
import { InstagramProviderService } from "./instagram-provider.service";
import { YoutubeProviderService } from "./youtube-provider.service";

@Injectable()
export class VideoIngestionService {
  constructor(
    private readonly youtubeProvider: YoutubeProviderService,
    private readonly instagramProvider: InstagramProviderService,
  ) {}

  async buildComparisonPair(videoUrlA: string, videoUrlB: string) {
    const [videoA, videoB] = await Promise.all([
      this.buildSeedForUrl(videoUrlA, "A"),
      this.buildSeedForUrl(videoUrlB, "B"),
    ]);

    return [videoA, videoB] as const;
  }

  private async buildSeedForUrl(url: string, side: "A" | "B"): Promise<VideoSeed> {
    const hostname = new URL(this.ensureHttps(url)).hostname.toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return this.youtubeProvider.buildSeed(url, side);
    }

    if (hostname.includes("instagram.com")) {
      return this.instagramProvider.buildSeed(url, side);
    }

    throw new Error("Only YouTube and Instagram URLs are currently supported.");
  }

  private ensureHttps(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
}
