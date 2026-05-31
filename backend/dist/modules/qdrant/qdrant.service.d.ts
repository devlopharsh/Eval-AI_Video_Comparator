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
export declare class QdrantService {
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly collection;
    private readonly apiKey;
    constructor(configService: ConfigService);
    ensureCollection(vectorSize: number): Promise<void>;
    upsertTranscriptChunks(chunks: UpsertChunkInput[]): Promise<void>;
    searchSimilarChunks(input: SearchInput): Promise<{
        id: string;
        score: number;
        payload: QdrantPayload | undefined;
    }[]>;
    private extractVectorSize;
    private buildHeaders;
}
export {};
