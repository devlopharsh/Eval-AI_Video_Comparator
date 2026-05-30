import { ConfigService } from "@nestjs/config";
export declare class EmbeddingService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly model;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
    private embedWithMode;
    private requiresInputType;
}
