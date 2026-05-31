# Eval Backend

NestJS backend foundation for the SRS-defined AI video comparison system.

## Architecture

- `NestJS` for modular application structure
- `Prisma + PostgreSQL` for persistence
- `BullMQ + Redis` for async ingestion jobs
- `Qdrant` prepared as the vector store target
- Qdrant collection bootstrap, upsert, and search wiring is now implemented
- OpenAI-compatible embeddings are required for ingestion and retrieval
- OpenAI-compatible chat generation is required for analysis responses
- TranscriptAPI can be used as the primary YouTube transcript source in hosted deployments
- YouTube metadata is now fetched through the YouTube Data API instead of `yt-dlp`
- chat routing, retrieval, context building, and generation are now separated into a workflow service
- the workflow service now runs on the actual LangGraph JS runtime
- controller-level tests cover ingest, video lookup, and chat streaming behavior
- SSE-style streaming response support on `POST /api/chat`

## What Exists

- `POST /api/ingest` creates a persistent session and queue job
- `GET /api/ingest/session/:sessionId` returns persisted ingestion state
- `GET /api/video/:id` returns persisted video details and chunk references
- `POST /api/chat` streams a persisted-session response over SSE
- Prisma schema for sessions, ingestion jobs, videos, transcript chunks, and chat messages
- BullMQ worker that processes a comparison pair and stores normalized video/chunk data
- provider services for:
  - YouTube metadata via the YouTube Data API plus transcript extraction via TranscriptAPI
  - Instagram metadata via `yt-dlp`
  - Whisper transcription for Reel audio when an OpenAI-compatible audio transcription endpoint is configured
- transcript chunks are upserted into Qdrant during ingestion
- retrieval-style chat requests now query Qdrant for chunk evidence
- chunk indexing and query retrieval share the same embedding provider abstraction, including NVIDIA-compatible `input_type` handling for embeddings
- chat responses now use one shared OpenAI chat model instead of separate fast/deep model selection
- orchestration is moving toward the SRS LangGraph structure via a dedicated workflow layer
- targeted workflow tests now cover metadata routing and retrieval routing behavior
- session status payloads now expose pipeline progress, latest job status, and persisted message restoration data

## Docker Run

1. Copy `.env.example` to `.env`.
2. Set the provider keys you actually need in `.env`.
3. Start the full backend stack:

```powershell
docker compose up --build
```

For local development, that single command now starts:

- PostgreSQL
- Redis
- Qdrant
- the NestJS backend container

The backend container will automatically:

- install Node dependencies during image build
- install `yt-dlp`, Python, and `ffmpeg`
- generate the Prisma client
- apply Prisma migrations with `prisma migrate deploy`
- start `dist/main.js`

For hosted deployment platforms like Render, the Docker image now only starts the backend application itself. PostgreSQL, Redis, and Qdrant are expected to be external managed services referenced through environment variables.

### Preferred YouTube Transcript Path

If you have a TranscriptAPI key and a YouTube Data API key, set:

```env
YOUTUBE_DATA_API_KEY=<your-youtube-data-api-key>
YOUTUBE_DATA_API_BASE_URL=https://www.googleapis.com/youtube/v3
TRANSCRIPT_API_KEY=<your-transcriptapi-key>
TRANSCRIPT_API_BASE_URL=https://transcriptapi.com/api/v2
YOUTUBE_TRANSCRIPT_PROVIDER=transcriptapi
```

The backend will then use:

- YouTube Data API for YouTube metadata
- TranscriptAPI for YouTube transcripts

`yt-dlp` remains in the codebase only for Instagram ingestion.

## Local Non-Docker Run

If you still want to run it manually outside Docker:

1. Start infrastructure with `docker compose up -d postgres redis qdrant`.
2. Install dependencies with `pnpm install`.
3. Generate Prisma client with `pnpm prisma:generate`.
4. Run migrations with `pnpm prisma:migrate`.
5. Start the backend with `pnpm dev`.
6. Run workflow tests with `pnpm test`.

Default server URL: `http://localhost:4000`

## Request Contracts

### Ingest

`POST /api/ingest`

```json
{
  "video_url_a": "https://youtube.com/watch?v=example-a",
  "video_url_b": "https://instagram.com/reel/example-b"
}
```

### Session Status

`GET /api/ingest/session/:sessionId`

Returns the session, queue job state, videos, and stored messages.

### Chat

`POST /api/chat`

```json
{
  "session_id": "returned-from-ingest",
  "message": "Why did Video A perform better than Video B?"
}
```

### Video Details

`GET /api/video/:id`

Use one of the video IDs saved under the session.

## Current Limitations

- Instagram ingestion still depends on external `yt-dlp` availability
- YouTube ingestion now requires both a YouTube Data API key and a TranscriptAPI key
- NVIDIA-compatible chat and embeddings activate automatically once `OPENAI_API_KEY` is present and pointed at `https://integrate.api.nvidia.com/v1`
- transcription is still not wired to a NVIDIA-compatible ASR endpoint in this codebase
- if metadata, transcript extraction, embeddings, or chat generation fail, the session now fails instead of substituting fake data
- full end-to-end API integration tests are still not implemented yet
