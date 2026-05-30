import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { JobStatus, SessionStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { INGESTION_JOB, INGESTION_QUEUE } from "../../shared/enums/ingestion-queue.enum";
import { IngestDto } from "../../shared/dto/ingest.dto";
import type { IngestionPayload } from "../../shared/types/ingestion.types";
import { ensureHttps } from "./ingestion.utils";

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectQueue(INGESTION_QUEUE) private readonly ingestionQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async createIngestionSession(body: IngestDto) {
    const session = await this.prisma.session.create({
      data: {
        status: SessionStatus.QUEUED,
      },
    });

    const payload: IngestionPayload = {
      sessionId: session.id,
      videoUrlA: ensureHttps(body.video_url_a),
      videoUrlB: ensureHttps(body.video_url_b),
    };

    const jobRecord = await this.prisma.ingestionJob.create({
      data: {
        sessionId: session.id,
        payload,
        status: JobStatus.QUEUED,
      },
    });

    const queueJob = await this.ingestionQueue.add(INGESTION_JOB, payload, {
      attempts: 3,
      removeOnComplete: 50,
      removeOnFail: 100,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
    });

    await this.prisma.ingestionJob.update({
      where: { id: jobRecord.id },
      data: {
        queueJobId: queueJob.id?.toString(),
      },
    });

    this.logger.log(`Created ingestion session ${session.id} with queue job ${queueJob.id?.toString() ?? "unknown"}.`);

    return {
      success: true,
      session_id: session.id,
      status: session.status,
      job_id: jobRecord.id,
      queue_job_id: queueJob.id?.toString() ?? null,
    };
  }
}
