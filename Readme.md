# EVAL - Smart AI Powered Video Comparing Platform

Eval is a AI powered platform which works over technologies like linegraph and other similar technologies implementing transcript retrieval, metadata analytics, and conversational RAG for video comparison in detail. The Platform takes the URL of the following shorts or reel divide them into small chunks have process over the script and create responses and information needed by the system. The system use [`OPEN AI`](https://developers.openai.com/api/docs) MODEL [`gpt-oss-20b`](https://developers.openai.com/api/docs/models/gpt-oss-20b) for making AI based decision implemented with langgraph in the system using Qdrant for vector storage, redis for caching and other similar technologies.

The complete architectural detail, working, system design, and related details are listed in the [`SRS.md`](/SRS.md). Please consider the read me file for the Quick and short overview of the project.

## Index

1. Project title and overview
2. Core features
3. High-level architecture
4. Tech stack
5. Repository structure
6. Production setup
7. AI Model overview
8. Known limitations and Drawbacks
9. Roadmap
10. References

## Overview

Eval is a AI Platform that compares two short-form social media videos(`Youtube`/`Instagram Reels`) using transcript retrieval, metadata analytics, and conversational RAG. Users submit video URLs, the system ingests and processes the videos, and then a chat interface provides grounded comparation with source citations.

## Features

- Compare videos from youtube shorts and instagram reels
- Extract metadata and transcripts
- Compute engagement metrics
- Store transcript chunks for semantic retrieval
- Ask questions in a multi-turn chat flow
- Stream grounded answers with citations

## Architecture and diagram

![Architectural Diagram](https://drive.google.com/file/d/1SzxpkHd2m5DLbhT171JcLzJsE3P1Suxo/view?usp=sharing)

## Tech Stack / Architecture

- frontend: `Next.js` , `TypeScript` , `tailwind CSS` , `Zustand`
- Backend: `pnpm` , `NEST.js` , `TypeScript`
- Orchestration: `LangGraph / LangChain`
- DB Services: `Prisma` , `PostGres`
- Queuing and Caching: `BullMQ` , `Redis`
- vector Database: `Qdrant`
- AI services:`Open AI` , `gpt-oss-20b`

## Repository Structure

```

 Eval
   ├── SRS.md
   |
   ├── Readme.md
   |
   ├── Fontend
   |       ├── app (contains the static pages of the application in it)
   |       ├── components (contains all the ui or client components of the following project)
   |       ├── lib (stores all the reusable function and other utilities programs)
   |       ├── stores (store zusand storage variables)
   |       ├── pakage.json (contains all the dependencies and scripts)
   |       ├── Readme.md (markdown file haing the information about frontend)
   |       └── .env (must be contained in the repository in order for having credentials)
   |
   └── Backend
           ├── dist (for bundling the compiled code)
           ├── prisma (contains schema of database and the migrations for the data access and manipulation)
           ├── src (contains he main logical files like controller , langraph , utils , etc.)
           ├── docker-compose.yml (docker file containing all the services in the yaml file.)
           ├── .env (must be contained in the repository in order for having credentials)
           ├── pakage.json (contains all the dependencies and scripts)
           └── Readme.md (markdown file haing the information about backend)

```

## Production Setup

For the production level setup , the user can use both the approaches the local build of the project or the
docker-compose. For a minimal and clear level build of **Backend**, `Docker` is suggested. For deployment simply run the command given below :

```Docker
docker compose up -d
```

This will run the necessary services images in the environment. After successfully executing the above command use the commands given below.

```
pnpm i
pnpm prisma:generate
pnpm prisma:migrate
pnpm start
```

For checking the successfull deployment, go over the route `/api/health`. This will highlight you the deployment status.

For the **Fontend** deployment , simply run the nextjs command given below.

```
npm i
npm run build
npm start
```

**System Prerequisite**

- Node.js
- pnpm
- Docker

## Current Status

Implemented:

- session-based ingestion flow
- persisted metadata and transcript chunk storage
- Qdrant-backed retrieval
- SSE chat streaming
- NestJS backend foundation
- Next.js frontend foundation

In progress or limited:

- full end-to-end integration coverage
- production-ready frontend documentation
- external tool dependency handling for Instagram ingestion

## References

- Product requirements: `SRS.md`
- Backend implementation notes: `backend/README.md`
- Backend scripts: `backend/package.json`
- Frontend scripts: `frontend/package.json`
