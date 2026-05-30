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
export declare class TranscriptChunkerService {
    private readonly embeddingService;
    constructor(embeddingService: EmbeddingService);
    chunkTranscript(input: ChunkInput): Promise<{
        videoId: string;
        chunkIndex: number;
        chunkKey: string;
        creator: string;
        platform: Platform;
        timestampStart: number;
        timestampEnd: number;
        text: string;
        embedding: number[];
    }[]>;
}
export {};
