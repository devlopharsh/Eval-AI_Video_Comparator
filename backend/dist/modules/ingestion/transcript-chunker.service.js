"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptChunkerService = void 0;
const common_1 = require("@nestjs/common");
const embedding_service_1 = require("../qdrant/embedding.service");
const CHUNK_SIZE = 800;
const OVERLAP = 150;
let TranscriptChunkerService = class TranscriptChunkerService {
    constructor(embeddingService) {
        this.embeddingService = embeddingService;
    }
    async chunkTranscript(input) {
        const chunks = [];
        let cursor = 0;
        let chunkIndex = 1;
        const chunkTexts = [];
        while (cursor < input.transcript.length) {
            const next = Math.min(cursor + CHUNK_SIZE, input.transcript.length);
            const text = input.transcript.slice(cursor, next).trim();
            if (!text) {
                break;
            }
            const startRatio = cursor / Math.max(input.transcript.length, 1);
            const endRatio = next / Math.max(input.transcript.length, 1);
            chunks.push({
                videoId: input.videoId,
                chunkIndex,
                chunkKey: `${input.side}_${chunkIndex}`,
                creator: input.creator,
                platform: input.platform,
                timestampStart: Math.floor(input.durationSeconds * startRatio),
                timestampEnd: Math.max(Math.floor(input.durationSeconds * endRatio), 1),
                text,
                embedding: [],
            });
            chunkTexts.push(text);
            if (next >= input.transcript.length) {
                break;
            }
            cursor = next - OVERLAP;
            chunkIndex += 1;
        }
        const embeddings = await this.embeddingService.embedDocuments(chunkTexts);
        for (let index = 0; index < chunks.length; index += 1) {
            chunks[index].embedding = embeddings[index];
        }
        return chunks;
    }
};
exports.TranscriptChunkerService = TranscriptChunkerService;
exports.TranscriptChunkerService = TranscriptChunkerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [embedding_service_1.EmbeddingService])
], TranscriptChunkerService);
