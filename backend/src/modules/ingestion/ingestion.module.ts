import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { INGESTION_QUEUE } from "../../shared/enums/ingestion-queue.enum";
import { QdrantModule } from "../qdrant/qdrant.module";
import { SessionReaderService } from "../sessions/session-reader.service";
import { IngestionController } from "./ingestion.controller";
import { IngestionProcessor } from "./ingestion.processor";
import { IngestionService } from "./ingestion.service";
import { IngestionShellService } from "./ingestion-shell.service";
import { InstagramProviderService } from "./instagram-provider.service";
import { OpenAiWhisperService } from "./openai-whisper.service";
import { TranscriptApiService } from "./transcript-api.service";
import { TranscriptChunkerService } from "./transcript-chunker.service";
import { VideoIngestionService } from "./video-ingestion.service";
import { YoutubeProviderService } from "./youtube-provider.service";

@Module({
  imports: [BullModule.registerQueue({ name: INGESTION_QUEUE }), QdrantModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionProcessor,
    IngestionShellService,
    OpenAiWhisperService,
    TranscriptApiService,
    YoutubeProviderService,
    InstagramProviderService,
    VideoIngestionService,
    TranscriptChunkerService,
    SessionReaderService,
  ],
  exports: [IngestionService, SessionReaderService],
})
export class IngestionModule {}
