import { IngestDto } from "../../shared/dto/ingest.dto";
import { SessionReaderService } from "../sessions/session-reader.service";
import { IngestionService } from "./ingestion.service";
export declare class IngestionController {
    private readonly ingestionService;
    private readonly sessionReaderService;
    constructor(ingestionService: IngestionService, sessionReaderService: SessionReaderService);
    ingest(body: IngestDto): Promise<{
        success: boolean;
        session_id: string;
        status: import(".prisma/client").$Enums.SessionStatus;
        job_id: string;
        queue_job_id: string | null;
    }>;
    getSession(sessionId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SessionStatus;
        failureReason: string | null;
        createdAt: Date;
        updatedAt: Date;
        latestJob: {
            sessionId: string;
            id: string;
            status: import(".prisma/client").$Enums.JobStatus;
            failureReason: string | null;
            createdAt: Date;
            updatedAt: Date;
            queueJobId: string | null;
            payload: import("@prisma/client/runtime/library").JsonValue;
        };
        pipeline: {
            readonly validation: "ready";
            readonly metadata: "failed" | "ready" | "pending";
            readonly transcript: "failed" | "ready" | "pending";
            readonly vector_store: "failed" | "ready" | "pending";
        };
        videos: {
            id: string;
            side: import(".prisma/client").$Enums.VideoSide;
            platform: import(".prisma/client").$Enums.Platform;
            title: string;
            creator: string;
        }[];
        messages: {
            id: string;
            role: import(".prisma/client").$Enums.MessageRole;
            content: string;
            createdAt: Date;
        }[];
    }>;
}
