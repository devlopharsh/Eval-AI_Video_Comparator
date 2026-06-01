import { ConfigService } from "@nestjs/config";
import { IngestionShellService } from "./ingestion-shell.service";
export declare class OpenAiWhisperService {
    private readonly configService;
    private readonly shellService;
    private readonly logger;
    constructor(configService: ConfigService, shellService: IngestionShellService);
    transcribeAudio(filePath: string): Promise<string>;
    private transcribeWithNvidia;
    private resolvePythonCommand;
    private canImportRiva;
    private getUploadFileName;
    private getUploadContentType;
}
