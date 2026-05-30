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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionController = void 0;
const common_1 = require("@nestjs/common");
const ingest_dto_1 = require("../../shared/dto/ingest.dto");
const session_reader_service_1 = require("../sessions/session-reader.service");
const ingestion_service_1 = require("./ingestion.service");
let IngestionController = class IngestionController {
    constructor(ingestionService, sessionReaderService) {
        this.ingestionService = ingestionService;
        this.sessionReaderService = sessionReaderService;
    }
    async ingest(body) {
        return this.ingestionService.createIngestionSession(body);
    }
    async getSession(sessionId) {
        return this.sessionReaderService.getSessionOrThrow(sessionId);
    }
};
exports.IngestionController = IngestionController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ingest_dto_1.IngestDto]),
    __metadata("design:returntype", Promise)
], IngestionController.prototype, "ingest", null);
__decorate([
    (0, common_1.Get)("session/:sessionId"),
    __param(0, (0, common_1.Param)("sessionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IngestionController.prototype, "getSession", null);
exports.IngestionController = IngestionController = __decorate([
    (0, common_1.Controller)("ingest"),
    __metadata("design:paramtypes", [ingestion_service_1.IngestionService,
        session_reader_service_1.SessionReaderService])
], IngestionController);
