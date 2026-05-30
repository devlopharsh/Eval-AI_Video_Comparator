import { VideosService } from "./videos.service";
export declare class VideosController {
    private readonly videosService;
    constructor(videosService: VideosService);
    getVideo(id: string): Promise<{
        id: string;
        side: import("@prisma/client").$Enums.VideoSide;
        platform: import("@prisma/client").$Enums.Platform;
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
