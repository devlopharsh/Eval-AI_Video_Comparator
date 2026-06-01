import { ConfigService } from "@nestjs/config";
import { IngestionShellService } from "./ingestion-shell.service";
import { OpenAiWhisperService } from "./openai-whisper.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class InstagramProviderService {
    private readonly configService;
    private readonly shellService;
    private readonly whisperService;
    private readonly logger;
    constructor(configService: ConfigService, shellService: IngestionShellService, whisperService: OpenAiWhisperService);
    buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed>;
    private loadMetadata;
    private loadTranscript;
    private loadTranscriptWithFallback;
    private parseUploadDate;
    private buildTranscriptFallback;
    private buildYtDlpArgs;
    private extractDownloadedAudioPath;
}
