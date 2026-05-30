import { ConfigService } from "@nestjs/config";
import type { Citation, ConversationTurn } from "./chat.types";
type GenerationInput = {
    model: string;
    route: "metadata" | "retrieval";
    question: string;
    conversation: ConversationTurn[];
    metadataContext: string;
    retrievedContext: string;
    citations: Citation[];
};
export declare class OpenAiGenerationService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly chatModel;
    constructor(configService: ConfigService);
    getModel(): string;
    generate(input: GenerationInput): Promise<string>;
    private buildMessages;
}
export {};
