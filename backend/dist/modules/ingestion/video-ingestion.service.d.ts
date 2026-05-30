import type { VideoSeed } from "../../shared/types/ingestion.types";
import { InstagramProviderService } from "./instagram-provider.service";
import { YoutubeProviderService } from "./youtube-provider.service";
export declare class VideoIngestionService {
    private readonly youtubeProvider;
    private readonly instagramProvider;
    constructor(youtubeProvider: YoutubeProviderService, instagramProvider: InstagramProviderService);
    buildComparisonPair(videoUrlA: string, videoUrlB: string): Promise<readonly [VideoSeed, VideoSeed]>;
    private buildSeedForUrl;
    private ensureHttps;
}
