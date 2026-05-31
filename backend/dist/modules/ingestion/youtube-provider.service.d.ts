import { ConfigService } from "@nestjs/config";
import { IngestionShellService } from "./ingestion-shell.service";
import { TranscriptApiService } from "./transcript-api.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class YoutubeProviderService {
    private readonly shellService;
    private readonly transcriptApiService;
    private readonly configService;
    private readonly logger;
    constructor(shellService: IngestionShellService, transcriptApiService: TranscriptApiService, configService: ConfigService);
    buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed>;
    private loadMetadata;
    private loadTranscript;
    private loadTranscriptWithTranscriptApi;
    private loadTranscriptWithYtDlp;
    private parseUploadDate;
    private extractTranscriptFromVtt;
    private buildYtDlpBaseArgs;
}
