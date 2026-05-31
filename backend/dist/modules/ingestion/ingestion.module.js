"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const ingestion_queue_enum_1 = require("../../shared/enums/ingestion-queue.enum");
const qdrant_module_1 = require("../qdrant/qdrant.module");
const session_reader_service_1 = require("../sessions/session-reader.service");
const ingestion_controller_1 = require("./ingestion.controller");
const ingestion_processor_1 = require("./ingestion.processor");
const ingestion_service_1 = require("./ingestion.service");
const ingestion_shell_service_1 = require("./ingestion-shell.service");
const instagram_provider_service_1 = require("./instagram-provider.service");
const openai_whisper_service_1 = require("./openai-whisper.service");
const transcript_api_service_1 = require("./transcript-api.service");
const transcript_chunker_service_1 = require("./transcript-chunker.service");
const video_ingestion_service_1 = require("./video-ingestion.service");
const youtube_provider_service_1 = require("./youtube-provider.service");
let IngestionModule = class IngestionModule {
};
exports.IngestionModule = IngestionModule;
exports.IngestionModule = IngestionModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: ingestion_queue_enum_1.INGESTION_QUEUE }), qdrant_module_1.QdrantModule],
        controllers: [ingestion_controller_1.IngestionController],
        providers: [
            ingestion_service_1.IngestionService,
            ingestion_processor_1.IngestionProcessor,
            ingestion_shell_service_1.IngestionShellService,
            openai_whisper_service_1.OpenAiWhisperService,
            transcript_api_service_1.TranscriptApiService,
            youtube_provider_service_1.YoutubeProviderService,
            instagram_provider_service_1.InstagramProviderService,
            video_ingestion_service_1.VideoIngestionService,
            transcript_chunker_service_1.TranscriptChunkerService,
            session_reader_service_1.SessionReaderService,
        ],
        exports: [ingestion_service_1.IngestionService, session_reader_service_1.SessionReaderService],
    })
], IngestionModule);
