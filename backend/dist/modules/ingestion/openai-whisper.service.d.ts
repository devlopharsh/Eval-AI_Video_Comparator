import { ConfigService } from "@nestjs/config";
export declare class OpenAiWhisperService {
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    transcribeAudio(filePath: string): Promise<string>;
}
