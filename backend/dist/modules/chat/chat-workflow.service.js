"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatWorkflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const langgraph_1 = require("@langchain/langgraph");
const embedding_service_1 = require("../qdrant/embedding.service");
const qdrant_service_1 = require("../qdrant/qdrant.service");
const openai_generation_service_1 = require("./openai-generation.service");
const WorkflowState = langgraph_1.Annotation.Root({
    sessionId: (0, langgraph_1.Annotation)(),
    question: (0, langgraph_1.Annotation)(),
    route: (0, langgraph_1.Annotation)(),
    model: (0, langgraph_1.Annotation)(),
    conversation: (0, langgraph_1.Annotation)(),
    videos: (0, langgraph_1.Annotation)(),
    retrievedChunks: (0, langgraph_1.Annotation)(),
    citations: (0, langgraph_1.Annotation)(),
    metadataContext: (0, langgraph_1.Annotation)(),
    retrievedContext: (0, langgraph_1.Annotation)(),
    message: (0, langgraph_1.Annotation)(),
});
let ChatWorkflowService = ChatWorkflowService_1 = class ChatWorkflowService {
    constructor(qdrantService, embeddingService, openAiGenerationService) {
        this.qdrantService = qdrantService;
        this.embeddingService = embeddingService;
        this.openAiGenerationService = openAiGenerationService;
        this.logger = new common_1.Logger(ChatWorkflowService_1.name);
    }
    async runComparisonWorkflow(sessionId, conversation, videos, question) {
        this.assertVideos(videos);
        this.logger.log(`Running comparison workflow for session ${sessionId}.`);
        const graph = new langgraph_1.StateGraph(WorkflowState)
            .addNode("routeQuestion", async (state) => ({
            route: this.routeQuestion(state.question),
            model: this.openAiGenerationService.getModel(),
        }))
            .addNode("retrieveChunks", async (state) => ({
            retrievedChunks: state.route === "retrieval"
                ? await this.retrieveChunks(state.sessionId, state.question)
                : [],
        }))
            .addNode("buildContext", async (state) => {
            const videoA = this.getVideo(state.videos, "A");
            const videoB = this.getVideo(state.videos, "B");
            const citations = state.route === "retrieval" && state.retrievedChunks.length > 0
                ? this.buildCitationsFromQdrant(state.retrievedChunks)
                : this.buildFallbackCitations(videoA, videoB);
            return {
                citations,
                metadataContext: this.buildMetadataContext(videoA, videoB),
                retrievedContext: this.buildRetrievedContext(state.retrievedChunks),
            };
        })
            .addNode("generateAnswer", async (state) => ({
            message: await this.openAiGenerationService.generate({
                model: state.model,
                route: state.route,
                question: state.question,
                conversation: state.conversation,
                metadataContext: state.metadataContext,
                retrievedContext: state.retrievedContext,
                citations: state.citations,
            }),
        }))
            .addEdge(langgraph_1.START, "routeQuestion")
            .addEdge("routeQuestion", "retrieveChunks")
            .addEdge("retrieveChunks", "buildContext")
            .addEdge("buildContext", "generateAnswer")
            .addEdge("generateAnswer", langgraph_1.END);
        const result = await graph.compile().invoke({
            sessionId,
            question,
            conversation,
            videos,
            retrievedChunks: [],
            citations: [],
            metadataContext: "",
            retrievedContext: "",
            message: "",
        });
        return {
            route: result.route,
            model: result.model,
            message: result.message,
            citations: result.citations,
        };
    }
    assertVideos(videos) {
        const videoA = videos.find((video) => video.side === "A");
        const videoB = videos.find((video) => video.side === "B");
        if (!videoA || !videoB) {
            throw new common_1.NotFoundException("Both comparison videos are required.");
        }
    }
    getVideo(videos, side) {
        const video = videos.find((entry) => entry.side === side);
        if (!video) {
            throw new common_1.NotFoundException(`Video ${side} is required.`);
        }
        return video;
    }
    routeQuestion(question) {
        return /\b(views|likes|comments|engagement|creator|duration|upload)\b/i.test(question)
            ? "metadata"
            : "retrieval";
    }
    async retrieveChunks(sessionId, question) {
        return this.qdrantService.searchSimilarChunks({
            sessionId,
            vector: await this.embeddingService.embedQuery(question),
            limit: 4,
        });
    }
    buildMetadataContext(videoA, videoB) {
        return [
            `Video A engagement rate: ${videoA.engagementRate}%`,
            `Video A summary: ${videoA.transcriptSummary}`,
            `Video B engagement rate: ${videoB.engagementRate}%`,
            `Video B summary: ${videoB.transcriptSummary}`,
        ].join("\n");
    }
    buildRetrievedContext(chunks) {
        return chunks
            .map((item) => item.payload?.text?.slice(0, 160).trim())
            .filter((value) => Boolean(value))
            .slice(0, 3)
            .join(" ");
    }
    buildCitationsFromQdrant(chunks) {
        return chunks
            .filter((item) => Boolean(item.payload))
            .map((item) => ({
            source: item.payload.side === "A" ? "Video A" : "Video B",
            chunkId: item.payload.chunkKey,
            timestamp: this.formatRange(item.payload.timestampStart, item.payload.timestampEnd),
        }));
    }
    buildFallbackCitations(videoA, videoB) {
        return [
            ...(videoA.chunks[0]
                ? [
                    {
                        source: "Video A",
                        chunkId: videoA.chunks[0].chunkKey,
                        timestamp: this.formatRange(videoA.chunks[0].timestampStart, videoA.chunks[0].timestampEnd),
                    },
                ]
                : []),
            ...(videoB.chunks[0]
                ? [
                    {
                        source: "Video B",
                        chunkId: videoB.chunks[0].chunkKey,
                        timestamp: this.formatRange(videoB.chunks[0].timestampStart, videoB.chunks[0].timestampEnd),
                    },
                ]
                : []),
        ];
    }
    formatRange(start, end) {
        const toTime = (value) => {
            const minutes = Math.floor(value / 60)
                .toString()
                .padStart(2, "0");
            const seconds = Math.floor(value % 60)
                .toString()
                .padStart(2, "0");
            return `${minutes}:${seconds}`;
        };
        return `${toTime(start)}-${toTime(end)}`;
    }
};
exports.ChatWorkflowService = ChatWorkflowService;
exports.ChatWorkflowService = ChatWorkflowService = ChatWorkflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [qdrant_service_1.QdrantService,
        embedding_service_1.EmbeddingService,
        openai_generation_service_1.OpenAiGenerationService])
], ChatWorkflowService);
