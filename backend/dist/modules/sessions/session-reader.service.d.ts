import { PrismaService } from "../prisma/prisma.service";
export declare class SessionReaderService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSessionOrThrow(sessionId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.SessionStatus;
        failureReason: string | null;
        createdAt: Date;
        updatedAt: Date;
        latestJob: {
            id: string;
            status: import("@prisma/client").$Enums.JobStatus;
            failureReason: string | null;
            createdAt: Date;
            updatedAt: Date;
            sessionId: string;
            queueJobId: string | null;
            payload: import("@prisma/client/runtime/library").JsonValue;
        };
        pipeline: {
            readonly validation: "ready";
            readonly metadata: "ready" | "failed" | "pending";
            readonly transcript: "ready" | "failed" | "pending";
            readonly vector_store: "ready" | "failed" | "pending";
        };
        videos: {
            id: string;
            side: import("@prisma/client").$Enums.VideoSide;
            platform: import("@prisma/client").$Enums.Platform;
            title: string;
            creator: string;
        }[];
        messages: {
            id: string;
            role: import("@prisma/client").$Enums.MessageRole;
            content: string;
            createdAt: Date;
        }[];
    }>;
}
