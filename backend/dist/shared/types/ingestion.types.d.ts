export type IngestionPayload = {
    sessionId: string;
    videoUrlA: string;
    videoUrlB: string;
};
export type VideoSeed = {
    side: "A" | "B";
    platform: "YOUTUBE" | "INSTAGRAM";
    sourceUrl: string;
    title: string;
    creator: string;
    followerCount: number;
    views: number;
    likes: number;
    comments: number;
    uploadDate: Date;
    durationSeconds: number;
    hashtags: string[];
    transcript: string;
    transcriptSummary: string;
    thumbnailUrl: string;
};
