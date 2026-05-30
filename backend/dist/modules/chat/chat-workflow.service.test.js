"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const chat_workflow_service_1 = require("./chat-workflow.service");
class FakeQdrantService {
    constructor() {
        this.queries = [];
    }
    async searchSimilarChunks(input) {
        this.queries.push(`${input.sessionId}:${input.limit}:${input.vector.length}`);
        return [
            {
                payload: {
                    side: "A",
                    chunkKey: "A_1",
                    timestampStart: 0,
                    timestampEnd: 8,
                    text: "Video A opens with a measurable promise and fast payoff.",
                },
            },
        ];
    }
}
class FakeEmbeddingService {
    async embedQuery(_text) {
        return [0.1, 0.2, 0.3];
    }
}
class FakeOpenAiGenerationService {
    getModel() {
        return "gpt-4o-mini";
    }
    async generate(input) {
        return `${input.route}|${input.citations.length}|${input.retrievedContext ? "ctx" : "noctx"}|${input.metadataContext.includes("Video A") ? "meta" : "nometa"}`;
    }
}
const videos = [
    {
        side: "A",
        engagementRate: 9.17,
        creator: "Northwind Growth",
        transcriptSummary: "Immediate quantified hook.",
        chunks: [{ chunkKey: "A_1", timestampStart: 0, timestampEnd: 8 }],
    },
    {
        side: "B",
        engagementRate: 6.37,
        creator: "Studio Switch",
        transcriptSummary: "Delayed payoff in the opening.",
        chunks: [{ chunkKey: "B_1", timestampStart: 0, timestampEnd: 6 }],
    },
];
(0, node_test_1.default)("workflow routes metadata questions without Qdrant retrieval", async () => {
    const qdrant = new FakeQdrantService();
    const service = new chat_workflow_service_1.ChatWorkflowService(qdrant, new FakeEmbeddingService(), new FakeOpenAiGenerationService());
    const result = await service.runComparisonWorkflow("session-1", [], [...videos], "Which creator has higher engagement?");
    strict_1.default.equal(result.route, "metadata");
    strict_1.default.equal(result.model, "gpt-4o-mini");
    strict_1.default.equal(qdrant.queries.length, 0);
    strict_1.default.equal(result.citations.length, 2);
});
(0, node_test_1.default)("workflow routes retrieval questions through Qdrant and builds citations", async () => {
    const qdrant = new FakeQdrantService();
    const service = new chat_workflow_service_1.ChatWorkflowService(qdrant, new FakeEmbeddingService(), new FakeOpenAiGenerationService());
    const result = await service.runComparisonWorkflow("session-2", [], [...videos], "Compare the hooks.");
    strict_1.default.equal(result.route, "retrieval");
    strict_1.default.equal(qdrant.queries.length, 1);
    strict_1.default.equal(result.citations.length, 1);
    strict_1.default.equal(result.citations[0].chunkId, "A_1");
    strict_1.default.match(result.message, /ctx/);
});
