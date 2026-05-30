import { WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { QdrantService } from "../qdrant/qdrant.service";
import type { IngestionPayload } from "../../shared/types/ingestion.types";
import { TranscriptChunkerService } from "./transcript-chunker.service";
import { VideoIngestionService } from "./video-ingestion.service";
export declare class IngestionProcessor extends WorkerHost {
    private readonly prisma;
    private readonly chunker;
    private readonly videoIngestionService;
    private readonly qdrantService;
    private readonly logger;
    constructor(prisma: PrismaService, chunker: TranscriptChunkerService, videoIngestionService: VideoIngestionService, qdrantService: QdrantService);
    process(job: Job<IngestionPayload>): Promise<void>;
    private calculateEngagement;
}
