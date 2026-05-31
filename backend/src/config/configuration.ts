type RawEnvironment = Record<string, string | undefined>;

export function configuration() {
  return {
    port: Number(process.env.PORT ?? 4000),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL ?? "",
    qdrant: {
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      collection: process.env.QDRANT_COLLECTION ?? "transcript_chunks",
      apiKey: process.env.QDRANT_API_KEY ?? "",
    },
    transcriptApi: {
      apiKey: process.env.TRANSCRIPT_API_KEY ?? "",
      baseUrl: process.env.TRANSCRIPT_API_BASE_URL ?? "https://transcriptapi.com/api/v2",
    },
    providers: {
      youtubeTranscript: process.env.YOUTUBE_TRANSCRIPT_PROVIDER ?? "",
      instagramIngest: process.env.INSTAGRAM_INGEST_PROVIDER ?? "",
      whisper: process.env.WHISPER_PROVIDER ?? "",
      openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? "",
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "nvidia/nv-embedqa-e5-v5",
      embeddingDimension: Number(process.env.OPENAI_EMBEDDING_DIMENSION ?? 1024),
      chatModel: process.env.OPENAI_CHAT_MODEL ?? "openai/gpt-oss-20b",
    },
    redis: {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD ?? "",
    },
  };
}

export function validateEnvironment(env: RawEnvironment) {
  const required = ["DATABASE_URL", "REDIS_HOST", "REDIS_PORT", "QDRANT_URL"];

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return env;
}
