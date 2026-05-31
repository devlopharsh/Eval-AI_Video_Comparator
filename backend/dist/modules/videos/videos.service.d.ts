import { PrismaService } from "../prisma/prisma.service";
export declare class VideosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getVideoDetails(id: string): Promise<{
        id: string;
        side: import(".prisma/client").$Enums.VideoSide;
        platform: import(".prisma/client").$Enums.Platform;
        title: string;
        creator: string;
        metrics: {
            views: number;
            likes: number;
            comments: number;
            engagement_rate: number;
        };
        upload_date: Date;
        duration_seconds: number;
        transcript: string;
        transcript_summary: string;
        hashtags: string[];
        thumbnail: string;
        citations: {
            chunk_id: string;
            timestamp_start: number;
            timestamp_end: number;
        }[];
    }>;
}
