import { EmbeddingService } from "../qdrant/embedding.service";
import { QdrantService } from "../qdrant/qdrant.service";
import { OpenAiGenerationService } from "./openai-generation.service";
import type { ConversationTurn, WorkflowAnswer, WorkflowVideo } from "./chat.types";
export declare class ChatWorkflowService {
    private readonly qdrantService;
    private readonly embeddingService;
    private readonly openAiGenerationService;
    private readonly logger;
    constructor(qdrantService: QdrantService, embeddingService: EmbeddingService, openAiGenerationService: OpenAiGenerationService);
    runComparisonWorkflow(sessionId: string, conversation: ConversationTurn[], videos: WorkflowVideo[], question: string): Promise<WorkflowAnswer>;
    private assertVideos;
    private getVideo;
    private routeQuestion;
    private retrieveChunks;
    private buildMetadataContext;
    private buildRetrievedContext;
    private buildCitationsFromQdrant;
    private buildFallbackCitations;
    private formatRange;
}
