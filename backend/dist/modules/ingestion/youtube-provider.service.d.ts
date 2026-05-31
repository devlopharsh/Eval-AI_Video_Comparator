import { TranscriptApiService } from "./transcript-api.service";
import { YoutubeDataApiService } from "./youtube-data-api.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class YoutubeProviderService {
    private readonly transcriptApiService;
    private readonly youtubeDataApiService;
    private readonly logger;
    constructor(transcriptApiService: TranscriptApiService, youtubeDataApiService: YoutubeDataApiService);
    buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed>;
    private loadMetadata;
    private loadTranscript;
}
