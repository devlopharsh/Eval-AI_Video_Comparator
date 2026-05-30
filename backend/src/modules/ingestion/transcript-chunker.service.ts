import { Injectable } from "@nestjs/common";
import type { Platform } from "@prisma/client";
import { EmbeddingService } from "../qdrant/embedding.service";

type ChunkInput = {
  videoId: string;
  side: "A" | "B";
  creator: string;
  platform: Platform;
  transcript: string;
  durationSeconds: number;
};

const CHUNK_SIZE = 800;
const OVERLAP = 150;

@Injectable()
export class TranscriptChunkerService {
  constructor(private readonly embeddingService: EmbeddingService) {}

  async chunkTranscript(input: ChunkInput) {
    const chunks: Array<{
      videoId: string;
      chunkIndex: number;
      chunkKey: string;
      creator: string;
      platform: Platform;
      timestampStart: number;
      timestampEnd: number;
      text: string;
      embedding: number[];
    }> = [];

    let cursor = 0;
    let chunkIndex = 1;
    const chunkTexts: string[] = [];

    while (cursor < input.transcript.length) {
      const next = Math.min(cursor + CHUNK_SIZE, input.transcript.length);
      const text = input.transcript.slice(cursor, next).trim();

      if (!text) {
        break;
      }

      const startRatio = cursor / Math.max(input.transcript.length, 1);
      const endRatio = next / Math.max(input.transcript.length, 1);

      chunks.push({
        videoId: input.videoId,
        chunkIndex,
        chunkKey: `${input.side}_${chunkIndex}`,
        creator: input.creator,
        platform: input.platform,
        timestampStart: Math.floor(input.durationSeconds * startRatio),
        timestampEnd: Math.max(Math.floor(input.durationSeconds * endRatio), 1),
        text,
        embedding: [],
      });
      chunkTexts.push(text);

      if (next >= input.transcript.length) {
        break;
      }

      cursor = next - OVERLAP;
      chunkIndex += 1;
    }

    const embeddings = await this.embeddingService.embedDocuments(chunkTexts);
    for (let index = 0; index < chunks.length; index += 1) {
      chunks[index].embedding = embeddings[index];
    }

    return chunks;
  }
}
