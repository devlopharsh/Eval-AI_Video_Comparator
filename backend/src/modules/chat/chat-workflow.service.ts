import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { END, START, Annotation, StateGraph } from "@langchain/langgraph";
import { EmbeddingService } from "../qdrant/embedding.service";
import { QdrantService } from "../qdrant/qdrant.service";
import { OpenAiGenerationService } from "./openai-generation.service";
import type { Citation, ConversationTurn, WorkflowAnswer, WorkflowVideo } from "./chat.types";

const WorkflowState = Annotation.Root({
  sessionId: Annotation<string>(),
  question: Annotation<string>(),
  route: Annotation<"metadata" | "retrieval">(),
  model: Annotation<string>(),
  conversation: Annotation<ConversationTurn[]>(),
  videos: Annotation<WorkflowVideo[]>(),
  retrievedChunks: Annotation<
    Array<{
      payload?: {
        side: "A" | "B";
        chunkKey: string;
        timestampStart: number;
        timestampEnd: number;
        text: string;
      };
    }>
  >(),
  citations: Annotation<Citation[]>(),
  metadataContext: Annotation<string>(),
  retrievedContext: Annotation<string>(),
  message: Annotation<string>(),
});

@Injectable()
export class ChatWorkflowService {
  private readonly logger = new Logger(ChatWorkflowService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
    private readonly openAiGenerationService: OpenAiGenerationService,
  ) {}

  async runComparisonWorkflow(
    sessionId: string,
    conversation: ConversationTurn[],
    videos: WorkflowVideo[],
    question: string,
  ): Promise<WorkflowAnswer> {
    this.assertVideos(videos);
    this.logger.log(`Running comparison workflow for session ${sessionId}.`);

    const graph = new StateGraph(WorkflowState)
      .addNode("routeQuestion", async (state) => ({
        route: this.routeQuestion(state.question),
        model: this.openAiGenerationService.getModel(),
      }))
      .addNode("retrieveChunks", async (state) => ({
        retrievedChunks:
          state.route === "retrieval"
            ? await this.retrieveChunks(state.sessionId, state.question)
            : [],
      }))
      .addNode("buildContext", async (state) => {
        const videoA = this.getVideo(state.videos, "A");
        const videoB = this.getVideo(state.videos, "B");
        const citations =
          state.route === "retrieval" && state.retrievedChunks.length > 0
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
      .addEdge(START, "routeQuestion")
      .addEdge("routeQuestion", "retrieveChunks")
      .addEdge("retrieveChunks", "buildContext")
      .addEdge("buildContext", "generateAnswer")
      .addEdge("generateAnswer", END);

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

  private assertVideos(videos: WorkflowVideo[]) {
    const videoA = videos.find((video) => video.side === "A");
    const videoB = videos.find((video) => video.side === "B");
    if (!videoA || !videoB) {
      throw new NotFoundException("Both comparison videos are required.");
    }
  }

  private getVideo(videos: WorkflowVideo[], side: "A" | "B") {
    const video = videos.find((entry) => entry.side === side);
    if (!video) {
      throw new NotFoundException(`Video ${side} is required.`);
    }
    return video;
  }

  private routeQuestion(question: string): "metadata" | "retrieval" {
    return /\b(views?|likes?|comments?|engagement|creator|duration|upload|posted|followers?|title|hashtags?)\b/i.test(
      question,
    )
      ? "metadata"
      : "retrieval";
  }

  private async retrieveChunks(sessionId: string, question: string) {
    return this.qdrantService.searchSimilarChunks({
      sessionId,
      vector: await this.embeddingService.embedQuery(question),
      limit: 4,
    });
  }

  private buildMetadataContext(videoA: WorkflowVideo, videoB: WorkflowVideo) {
    const buildVideoBlock = (label: "A" | "B", video: WorkflowVideo) => [
      `Video ${label} platform: ${video.platform}`,
      `Video ${label} title: ${video.title}`,
      `Video ${label} creator: ${video.creator}`,
      `Video ${label} followers: ${video.followerCount}`,
      `Video ${label} views: ${video.views}`,
      `Video ${label} likes: ${video.likes}`,
      `Video ${label} comments: ${video.comments}`,
      `Video ${label} engagement rate: ${video.engagementRate}%`,
      `Video ${label} duration: ${video.durationSeconds} seconds`,
      `Video ${label} upload date: ${video.uploadDate.toISOString().slice(0, 10)}`,
      `Video ${label} hashtags: ${video.hashtags.length > 0 ? video.hashtags.join(", ") : "none"}`,
      `Video ${label} summary: ${video.transcriptSummary}`,
    ];

    return [
      ...buildVideoBlock("A", videoA),
      ...buildVideoBlock("B", videoB),
    ].join("\n");
  }

  private buildRetrievedContext(
    chunks: Array<{
      payload?: {
        text: string;
      };
    }>,
  ) {
    return chunks
      .map((item) => item.payload?.text?.slice(0, 160).trim())
      .filter((value): value is string => Boolean(value))
      .slice(0, 3)
      .join(" ");
  }

  private buildCitationsFromQdrant(
    chunks: Array<{
      payload?: {
        side: "A" | "B";
        chunkKey: string;
        timestampStart: number;
        timestampEnd: number;
      };
    }>,
  ): Citation[] {
    return chunks
      .filter(
        (
          item,
        ): item is {
          payload: {
            side: "A" | "B";
            chunkKey: string;
            timestampStart: number;
            timestampEnd: number;
          };
        } => Boolean(item.payload),
      )
      .map((item) => ({
        source: item.payload.side === "A" ? "Video A" : "Video B",
        chunkId: item.payload.chunkKey,
        timestamp: this.formatRange(item.payload.timestampStart, item.payload.timestampEnd),
      }));
  }

  private buildFallbackCitations(videoA: WorkflowVideo, videoB: WorkflowVideo): Citation[] {
    return [
      ...(videoA.chunks[0]
        ? [
            {
              source: "Video A" as const,
              chunkId: videoA.chunks[0].chunkKey,
              timestamp: this.formatRange(videoA.chunks[0].timestampStart, videoA.chunks[0].timestampEnd),
            },
          ]
        : []),
      ...(videoB.chunks[0]
        ? [
            {
              source: "Video B" as const,
              chunkId: videoB.chunks[0].chunkKey,
              timestamp: this.formatRange(videoB.chunks[0].timestampStart, videoB.chunks[0].timestampEnd),
            },
          ]
        : []),
    ];
  }

  private formatRange(start: number, end: number) {
    const toTime = (value: number) => {
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
}
