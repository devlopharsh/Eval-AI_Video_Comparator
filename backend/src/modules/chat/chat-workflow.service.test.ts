import assert from "node:assert/strict";
import test from "node:test";
import { ChatWorkflowService } from "./chat-workflow.service";

class FakeQdrantService {
  public queries: string[] = [];

  async searchSimilarChunks(input: { sessionId: string; vector: number[]; limit: number }) {
    this.queries.push(`${input.sessionId}:${input.limit}:${input.vector.length}`);
    return [
      {
        payload: {
          side: "A" as const,
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
  async embedQuery(_text: string) {
    return [0.1, 0.2, 0.3];
  }
}

class FakeOpenAiGenerationService {
  getModel() {
    return "gpt-4o-mini";
  }

  async generate(input: {
    route: "metadata" | "retrieval";
    retrievedContext: string;
    metadataContext: string;
    citations: Array<{ chunkId: string }>;
  }) {
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

test("workflow routes metadata questions without Qdrant retrieval", async () => {
  const qdrant = new FakeQdrantService();
  const service = new ChatWorkflowService(
    qdrant as never,
    new FakeEmbeddingService() as never,
    new FakeOpenAiGenerationService() as never,
  );

  const result = await service.runComparisonWorkflow("session-1", [], [...videos], "Which creator has higher engagement?");

  assert.equal(result.route, "metadata");
  assert.equal(result.model, "gpt-4o-mini");
  assert.equal(qdrant.queries.length, 0);
  assert.equal(result.citations.length, 2);
});

test("workflow routes retrieval questions through Qdrant and builds citations", async () => {
  const qdrant = new FakeQdrantService();
  const service = new ChatWorkflowService(
    qdrant as never,
    new FakeEmbeddingService() as never,
    new FakeOpenAiGenerationService() as never,
  );

  const result = await service.runComparisonWorkflow("session-2", [], [...videos], "Compare the hooks.");

  assert.equal(result.route, "retrieval");
  assert.equal(qdrant.queries.length, 1);
  assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0].chunkId, "A_1");
  assert.match(result.message, /ctx/);
});
