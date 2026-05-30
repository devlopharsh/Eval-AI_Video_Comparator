import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IngestDto } from "../../shared/dto/ingest.dto";
import { SessionReaderService } from "../sessions/session-reader.service";
import { IngestionService } from "./ingestion.service";

@Controller("ingest")
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly sessionReaderService: SessionReaderService,
  ) {}

  @Post()
  async ingest(@Body() body: IngestDto) {
    return this.ingestionService.createIngestionSession(body);
  }

  @Get("session/:sessionId")
  async getSession(@Param("sessionId") sessionId: string) {
    return this.sessionReaderService.getSessionOrThrow(sessionId);
  }
}
