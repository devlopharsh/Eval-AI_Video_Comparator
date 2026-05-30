import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { IngestDto } from "../../shared/dto/ingest.dto";
export declare class IngestionService {
    private readonly ingestionQueue;
    private readonly prisma;
    private readonly logger;
    constructor(ingestionQueue: Queue, prisma: PrismaService);
    createIngestionSession(body: IngestDto): Promise<{
        success: boolean;
        session_id: string;
        status: import("@prisma/client").$Enums.SessionStatus;
        job_id: string;
        queue_job_id: string | null;
    }>;
}
