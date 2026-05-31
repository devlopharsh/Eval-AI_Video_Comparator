import { ConfigService } from "@nestjs/config";
export declare class TranscriptApiService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    isConfigured(): boolean;
    fetchYoutubeTranscript(videoUrl: string): Promise<{
        transcript: string;
        language: string;
        segments: {
            text: string;
            start: number;
            duration: number;
        }[];
    }>;
}
