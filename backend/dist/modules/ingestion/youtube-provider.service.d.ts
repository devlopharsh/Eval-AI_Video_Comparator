import { IngestionShellService } from "./ingestion-shell.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class YoutubeProviderService {
    private readonly shellService;
    private readonly logger;
    constructor(shellService: IngestionShellService);
    buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed>;
    private loadMetadata;
    private loadTranscriptWithYtDlp;
    private parseUploadDate;
    private extractTranscriptFromVtt;
    private buildYtDlpBaseArgs;
}
