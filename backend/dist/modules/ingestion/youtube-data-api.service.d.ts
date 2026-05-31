import { ConfigService } from "@nestjs/config";
export type YoutubeApiMetadata = {
    title: string;
    creator: string;
    thumbnailUrl: string;
    durationSeconds: number;
    uploadDate: Date;
    followerCount: number;
    views: number;
    likes: number;
    comments: number;
    hashtags: string[];
};
export declare class YoutubeDataApiService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    fetchMetadata(videoUrl: string): Promise<YoutubeApiMetadata>;
    private fetchVideo;
    private fetchSubscriberCount;
    private extractVideoId;
    private pickThumbnail;
    private parseIsoDuration;
    private buildHashtags;
}
