import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type QdrantPayload = {
  sessionId: string;
  videoId: string;
  side: "A" | "B";
  platform: string;
  creator: string;
  chunkKey: string;
  timestampStart: number;
  timestampEnd: number;
  text: string;
};

type UpsertChunkInput = {
  id: string;
  vector: number[];
  payload: QdrantPayload;
};

type SearchInput = {
  sessionId: string;
  vector: number[];
  limit: number;
  side?: "A" | "B";
};

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private readonly baseUrl: string;
  private readonly collection: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>("qdrant.url");
    this.collection = this.configService.getOrThrow<string>("qdrant.collection");
    this.apiKey = this.configService.get<string>("qdrant.apiKey") ?? "";
  }

  async ensureCollection(vectorSize: number) {
    const collectionUrl = `${this.baseUrl}/collections/${this.collection}`;
    const existing = await fetch(collectionUrl);

    if (existing.ok) {
      const payload = (await existing.json()) as {
        result?: {
          config?: {
            params?: {
              vectors?:
                | {
                    size?: number;
                  }
                | Record<string, { size?: number }>;
            };
          };
        };
      };

      const configuredVectors = payload.result?.config?.params?.vectors;
      const existingSize = this.extractVectorSize(configuredVectors);

      if (typeof existingSize === "number" && existingSize !== vectorSize) {
        throw new Error(
          `Qdrant collection "${this.collection}" expects vectors of dimension ${existingSize}, but received ${vectorSize}. Recreate the collection or align the configured embedding model dimension.`,
        );
      }

      return;
    }

    const response = await fetch(collectionUrl, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Qdrant collection: ${await response.text()}`);
    }
  }

  async upsertTranscriptChunks(chunks: UpsertChunkInput[]) {
    if (chunks.length === 0) {
      return;
    }

    await this.ensureCollection(chunks[0].vector.length);

    const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points`, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        points: chunks.map((chunk) => ({
          id: chunk.id,
          vector: chunk.vector,
          payload: chunk.payload,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upsert Qdrant points: ${await response.text()}`);
    }

    this.logger.log(`Upserted ${chunks.length} transcript chunks into Qdrant.`);
  }

  async searchSimilarChunks(input: SearchInput) {
    await this.ensureCollection(input.vector.length);

    const must: Array<Record<string, unknown>> = [
      {
        key: "sessionId",
        match: {
          value: input.sessionId,
        },
      },
    ];

    if (input.side) {
      must.push({
        key: "side",
        match: {
          value: input.side,
        },
      });
    }

    const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/search`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        vector: input.vector,
        limit: input.limit,
        with_payload: true,
        filter: {
          must,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search Qdrant: ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      result?: Array<{
        id: string | number;
        score: number;
        payload?: QdrantPayload;
      }>;
    };

    return (payload.result ?? []).map((item) => ({
      id: String(item.id),
      score: item.score,
      payload: item.payload,
    }));
  }

  private extractVectorSize(
    vectors:
      | {
          size?: number;
        }
      | Record<string, { size?: number }>
      | undefined,
  ) {
    if (!vectors) {
      return undefined;
    }

    if ("size" in vectors && typeof vectors.size === "number") {
      return vectors.size;
    }

    const firstNamedVector = Object.values(vectors)[0];
    return firstNamedVector?.size;
  }

  private buildHeaders() {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { "api-key": this.apiKey } : {}),
    };
  }
}
