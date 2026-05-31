type RawEnvironment = Record<string, string | undefined>;
export declare function configuration(): {
    port: number;
    clientOrigin: string;
    databaseUrl: string;
    qdrant: {
        url: string;
        collection: string;
        apiKey: string;
    };
    transcriptApi: {
        apiKey: string;
        baseUrl: string;
    };
    providers: {
        youtubeTranscript: string;
        instagramIngest: string;
        whisper: string;
        openAiApiKey: string;
    };
    openai: {
        apiKey: string;
        baseUrl: string;
        embeddingModel: string;
        embeddingDimension: number;
        chatModel: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
};
export declare function validateEnvironment(env: RawEnvironment): RawEnvironment;
export {};
