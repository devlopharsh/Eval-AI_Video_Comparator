import { IngestionShellService } from "./ingestion-shell.service";
import { OpenAiWhisperService } from "./openai-whisper.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";
export declare class InstagramProviderService {
    private readonly shellService;
    private readonly whisperService;
    private readonly logger;
    constructor(shellService: IngestionShellService, whisperService: OpenAiWhisperService);
    buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed>;
    private loadMetadata;
    private loadTranscript;
    private parseUploadDate;
}
