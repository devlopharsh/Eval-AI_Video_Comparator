# Software Requirements Specification (SRS)

# Eval - AI Powered Social Media Video Comparison RAG Chatbot

Version: 2.0
Prepared By: Harsh Kumar
Architecture Style: Full-Stack RAG System with LangGraph Orchestration
Primary Language: TypeScript
Backend Runtime: Node.js

---

# 1. Introduction

## 1.1 Purpose

The purpose of this project is to develop a production-grade AI-powered Retrieval-Augmented Generation (RAG) chatbot capable of:

- ingesting YouTube and Instagram Reel URLs
- extracting transcripts and metadata dynamically
- computing engagement metrics
- generating semantic embeddings
- storing vectorized transcript chunks
- enabling conversational AI-based video comparison
- providing grounded responses with source citations
- maintaining multi-turn conversational memory

The system is intended for creators, marketers, and social media analysts who want AI-generated insights into video performance.

---

# 1.2 Objectives

The system must:

- dynamically process video URLs
- perform transcript extraction
- compute engagement metrics
- support semantic retrieval
- support conversational memory
- stream responses in real time
- provide grounded citations
- scale efficiently for large user volume
- minimize operational costs

---

# 1.3 Scope

The application supports:

- YouTube videos
- Instagram Reels
- semantic transcript analysis
- metadata analytics
- conversational AI querying
- retrieval-augmented generation
- side-by-side video comparison

The application currently excludes:

- TikTok support
- multilingual translation
- video editing
- fine-tuned custom LLMs
- advanced vision models

---

# 2. System Overview

The application is a full-stack RAG chatbot using:

- Next.js frontend
- Node.js + Express backend
- LangGraph orchestration
- Qdrant vector database
- PostgreSQL metadata storage
- OpenAI LLM APIs
- OpenAI embeddings
- Whisper transcription pipeline

The system flow:

1. User submits two video URLs
2. Backend validates URLs
3. Metadata extracted dynamically
4. Transcript retrieved/generated
5. Transcript chunked
6. Embeddings generated
7. Chunks stored in vector DB
8. User asks analytical questions
9. LangGraph orchestrates retrieval flow
10. Relevant chunks retrieved
11. LLM generates grounded response
12. Response streamed to frontend

---

# 3. Functional Requirements

# 3.1 Video URL Ingestion

## Inputs

- YouTube URL
- Instagram Reel URL

## Functional Requirements

The system must:

- validate URLs dynamically
- support asynchronous ingestion
- prevent duplicate processing
- cache processed videos
- support retries for failed ingestion

---

# 3.2 Metadata Extraction

The system must dynamically extract:

| Field          | Description          |
| -------------- | -------------------- |
| title          | video title          |
| creator        | creator/channel name |
| views          | total views          |
| likes          | total likes          |
| comments       | total comments       |
| upload_date    | publish date         |
| duration       | video duration       |
| hashtags       | extracted hashtags   |
| follower_count | creator followers    |

---

# 3.3 Engagement Rate Calculation

The system must dynamically calculate engagement rate.

Formula:

Engagement Rate = ((likes + comments) / views) × 100

The result must be stored in PostgreSQL.

---

# 3.4 Transcript Processing

The system must:

- retrieve YouTube transcripts
- generate transcripts for Instagram Reels
- preserve timestamps
- normalize transcript text
- remove transcription noise

---

# 3.5 Chunking

The transcript must be split into semantic chunks.

## Chunking Configuration

| Property   | Value |
| ---------- | ----- |
| chunk_size | 800   |
| overlap    | 150   |

---

## Chunk Metadata

Each chunk must contain:

| Field           | Description       |
| --------------- | ----------------- |
| chunk_id        | unique chunk ID   |
| video_id        | A or B            |
| timestamp_start | start timestamp   |
| timestamp_end   | end timestamp     |
| creator         | creator name      |
| platform        | youtube/instagram |

---

# 3.6 Embedding Generation

The system must:

- generate embeddings dynamically
- embed every transcript chunk
- attach metadata payloads
- store vectors in Qdrant

---

# 3.7 Vector Search

The system must:

- perform semantic similarity search
- retrieve top-k chunks
- support metadata filtering
- support source citation generation

---

# 3.8 Conversational RAG Chatbot

The chatbot must support:

- multi-turn conversation
- conversational memory
- semantic retrieval
- grounded responses
- streaming responses
- source citations

---

## Example Queries

- Why did Video A perform better than Video B?
- Compare the hooks.
- Suggest improvements for B.
- Which creator has higher engagement?
- Compare pacing and storytelling.

---

# 3.9 Streaming Responses

The backend must stream tokens in real time using:

- Server-Sent Events (SSE)

---

# 3.10 Source Citations

Every response must include:

- source video
- chunk ID
- timestamp

Example:

[Source: Video A | Chunk A_2 | 00:00–00:05]

---

# 4. Non-Functional Requirements

# 4.1 Performance

The system must:

- respond within 4 seconds for normal queries
- retrieve vectors within 500ms
- support 1000 creators/day

---

# 4.2 Scalability

The system must support:

- asynchronous ingestion
- distributed workers
- horizontal backend scaling
- scalable vector retrieval

---

# 4.3 Reliability

The system must provide:

- retry mechanisms
- transcript fallbacks
- graceful error handling
- API timeout handling

---

# 4.4 Maintainability

The system must follow:

- modular architecture
- TypeScript typing
- reusable services
- clean separation of concerns

---

# 4.5 Security

The system must implement:

- API key protection
- CORS handling
- URL validation
- rate limiting
- environment variable encryption

---

# 5. Recommended Technology Stack

# 5.1 Frontend

| Technology     | Purpose            |
| -------------- | ------------------ |
| Next.js        | frontend framework |
| TypeScript     | typed frontend     |
| Tailwind CSS   | styling            |
| shadcn/ui      | UI components      |
| Zustand        | state management   |
| React Markdown | markdown rendering |

---

# 5.2 Backend

| Technology | Purpose             |
| ---------- | ------------------- |
| Node.js    | backend runtime     |
| Express.js | API framework       |
| TypeScript | typed backend       |
| ts-node    | development runtime |

---

# 5.3 AI Orchestration

| Technology   | Purpose                   |
| ------------ | ------------------------- |
| LangGraph JS | AI workflow orchestration |
| LangChain JS | retrieval abstractions    |

---

# 5.4 Vector Database

| Technology | Purpose         |
| ---------- | --------------- |
| Qdrant     | vector database |

---

# 5.5 Database

| Technology | Purpose          |
| ---------- | ---------------- |
| PostgreSQL | metadata storage |
| Redis      | caching + queues |

---

# 5.6 Queue System

| Technology | Purpose              |
| ---------- | -------------------- |
| BullMQ     | async job processing |

---

# 5.7 Embeddings

| Technology        | Purpose             |
| ----------------- | ------------------- |
| OpenAI Embeddings | semantic embeddings |

Recommended Model:

text-embedding-3-small

---

# 5.8 LLM

| Model       | Use                |
| ----------- | ------------------ |
| GPT-4o-mini | standard queries   |
| GPT-4o      | advanced reasoning |

---

# 5.9 Transcript Extraction

| Technology             | Purpose                  |
| ---------------------- | ------------------------ |
| youtube-transcript-api | YouTube transcripts      |
| yt-dlp                 | Instagram video download |
| Whisper API            | speech-to-text           |
| ffmpeg                 | audio extraction         |

---

# 6. High-Level Architecture

```
                ┌──────────────────────────┐
                │       Frontend           │
                │ Next.js + TypeScript     │
                └────────────┬─────────────┘
                             │
                       SSE Streaming
                             │
                             ▼
                ┌──────────────────────────┐
                │      Express Backend     │
                │      LangGraph JS        │
                └────────────┬─────────────┘
                             │
      ┌────────────────────────────────────────────┐
      ▼                                            ▼
┌──────────────────────────┐               ┌──────────────────────────┐
│ PostgreSQL Metadata DB   │               │     Qdrant Vector DB     │
└──────────────────────────┘               └──────────────────────────┘
      ▲                                             ▲
      │                                             │
      └────────────────┬────────────────────────────┘
                       ▼
          ┌──────────────────────────┐
          │ Async Worker Pipeline    │
          │ yt-dlp + Whisper + Embed │
          └──────────────────────────┘
```

---

# 7. LangGraph Workflow

# 7.1 LangGraph Nodes

| Node                  | Responsibility        |
| --------------------- | --------------------- |
| URL Validator Node    | validate URLs         |
| Metadata Fetch Node   | extract metadata      |
| Transcript Fetch Node | retrieve transcripts  |
| Whisper Node          | generate transcripts  |
| Chunking Node         | split transcripts     |
| Embedding Node        | generate embeddings   |
| Vector Store Node     | store vectors         |
| Retriever Node        | semantic retrieval    |
| Metadata Query Node   | query PostgreSQL      |
| Context Builder Node  | prepare prompt        |
| LLM Node              | generate response     |
| Citation Node         | append citations      |
| Memory Node           | maintain conversation |

---

# 7.2 LangGraph Flow

User Query
↓
Intent Router
↓
Metadata Question?
├── YES → PostgreSQL Query
└── NO → Vector Retrieval
↓
Qdrant Search
↓
Context Builder
↓
LLM Analysis
↓
Citation Builder
↓
Streaming Response

---

# 8. Database Design

# 8.1 PostgreSQL Schema

## videos table

| Column          | Type      |
| --------------- | --------- |
| id              | UUID      |
| platform        | TEXT      |
| title           | TEXT      |
| creator         | TEXT      |
| views           | BIGINT    |
| likes           | BIGINT    |
| comments        | BIGINT    |
| engagement_rate | FLOAT     |
| upload_date     | TIMESTAMP |
| duration        | INTEGER   |
| transcript      | TEXT      |

---

# 8.2 Vector Payload Schema

{
"chunk_id": "A_1",
"video_id": "A",
"platform": "youtube",
"creator": "creator_name",
"timestamp_start": 0,
"timestamp_end": 5
}

---

# 9. API Design

# 9.1 Ingestion API

POST /api/ingest

Request:

{
"youtube_url": "...",
"instagram_url": "..."
}

Response:

{
"success": true,
"session_id": "xyz"
}

---

# 9.2 Chat API

POST /api/chat

Request:

{
"message": "Why did Video A perform better?"
}

Response:

Streaming AI response with citations.

---

# 9.3 Video Details API

GET /api/video/:id

Returns:

- metadata
- engagement rate
- transcript
- thumbnail

---

# 10. Frontend Requirements

The frontend must include:

- side-by-side video cards
- transcript summaries
- metrics display
- streaming chat interface
- markdown rendering
- citation rendering
- responsive layout

---

# 11. Cost Optimization Strategy

The system minimizes operational cost using:

- transcript caching
- vector caching
- metadata routing
- model routing
- async processing
- reusable embeddings

---

# 11.1 Model Routing

| Query Type              | Model       |
| ----------------------- | ----------- |
| simple factual queries  | GPT-4o-mini |
| deep analytical queries | GPT-4o      |

---

# 12. Scalability Strategy

# 12.1 Horizontal Scaling

| Component   | Scaling Strategy    |
| ----------- | ------------------- |
| Express API | multiple containers |
| Workers     | distributed queues  |
| Qdrant      | clustering          |
| Redis       | distributed caching |

---

# 12.2 Async Architecture

The ingestion system must run asynchronously using BullMQ.

Flow:

URL Submission
↓
Queue Job
↓
Transcript Processing
↓
Embedding
↓
Storage
↓
Ready State

---

# 13. Deployment Strategy

# 13.1 Frontend Deployment

- Vercel

---

# 13.2 Backend Deployment

- Railway
- Render
- AWS ECS

---

# 13.3 Vector Database

- Dockerized Qdrant instance

---

# 13.4 Containerization

All services must use Docker containers.

---

# 14. Error Handling

The system must handle:

- invalid URLs
- unavailable transcripts
- failed downloads
- rate limits
- API failures
- vector DB downtime
- OpenAI failures

Fallback mechanisms are mandatory.

---

# 15. Monitoring & Logging

Recommended tools:

| Tool          | Purpose          |
| ------------- | ---------------- |
| Winston       | backend logging  |
| Sentry        | error monitoring |
| OpenTelemetry | tracing          |

---

# 16. Future Improvements

Planned future enhancements:

- TikTok support
- multilingual analysis
- thumbnail AI analysis
- sentiment analysis
- retention prediction
- creator analytics dashboard
- multi-video comparisons

---

# 17. Success Criteria

The project is considered successful if:

- video ingestion works dynamically
- RAG responses are grounded
- citations are accurate
- responses stream correctly
- conversational memory works
- system handles scaling efficiently
- UI remains responsive
- no hardcoded outputs exist

---

# 18. Conclusion

This project implements a production-grade AI-powered Retrieval-Augmented Generation system for social media video intelligence.

The architecture prioritizes:

- scalability
- low latency
- cost optimization
- modularity
- streaming UX
- maintainability
- AI orchestration reliability

The system combines LangGraph workflows, semantic retrieval, vector databases, metadata analytics, and conversational AI into a unified creator-analysis platform built entirely with TypeScript and Node.js.
