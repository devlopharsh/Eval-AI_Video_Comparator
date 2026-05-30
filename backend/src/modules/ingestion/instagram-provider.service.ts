import { Injectable, Logger } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSummaryFromTranscript, extractHashtags } from "./ingestion.utils";
import { IngestionShellService } from "./ingestion-shell.service";
import { OpenAiWhisperService } from "./openai-whisper.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";

type InstagramMetadata = {
  title: string;
  creator: string;
  thumbnailUrl: string;
  durationSeconds: number;
  uploadDate: Date;
  followerCount: number;
  views: number;
  likes: number;
  comments: number;
  hashtags: string[];
};

@Injectable()
export class InstagramProviderService {
  private readonly logger = new Logger(InstagramProviderService.name);

  constructor(
    private readonly shellService: IngestionShellService,
    private readonly whisperService: OpenAiWhisperService,
  ) {}

  async buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed> {
    const metadata = await this.loadMetadata(url);
    const transcript = await this.loadTranscript(url);

    return {
      side,
      platform: "INSTAGRAM",
      sourceUrl: url,
      title: metadata.title,
      creator: metadata.creator,
      followerCount: metadata.followerCount,
      views: metadata.views,
      likes: metadata.likes,
      comments: metadata.comments,
      uploadDate: metadata.uploadDate,
      durationSeconds: metadata.durationSeconds,
      hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : extractHashtags(transcript),
      transcript,
      transcriptSummary: buildSummaryFromTranscript(transcript),
      thumbnailUrl: metadata.thumbnailUrl,
    };
  }

  private async loadMetadata(url: string): Promise<InstagramMetadata> {
    const hasYtDlp = await this.shellService.commandExists("yt-dlp");
    if (!hasYtDlp) {
      throw new Error("yt-dlp is required for Instagram metadata ingestion.");
    }

    try {
      const { stdout } = await this.shellService.run("yt-dlp", ["--dump-single-json", url], 120000);
      const payload = JSON.parse(stdout) as {
        title?: string;
        uploader?: string;
        thumbnail?: string;
        duration?: number;
        upload_date?: string;
        description?: string;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        channel_follower_count?: number;
        uploader_follower_count?: number;
      };

      if (!payload.title || !payload.uploader || !payload.thumbnail || !payload.upload_date) {
        throw new Error("yt-dlp returned incomplete Instagram metadata.");
      }

      return {
        title: payload.title,
        creator: payload.uploader,
        thumbnailUrl: payload.thumbnail,
        durationSeconds: payload.duration ?? 0,
        uploadDate: this.parseUploadDate(payload.upload_date),
        followerCount: payload.channel_follower_count ?? payload.uploader_follower_count ?? 0,
        views: payload.view_count ?? 0,
        likes: payload.like_count ?? 0,
        comments: payload.comment_count ?? 0,
        hashtags: extractHashtags(payload.description || ""),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`yt-dlp metadata fetch failed for Instagram: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async loadTranscript(url: string) {
    const hasYtDlp = await this.shellService.commandExists("yt-dlp");
    if (!hasYtDlp) {
      throw new Error("yt-dlp is required for Instagram transcript ingestion.");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "eval-instagram-"));
    const audioBase = join(tempDir, "source");

    try {
      await this.shellService.run("yt-dlp", ["-x", "--audio-format", "mp3", "-o", audioBase, url], 180000);
      const audioPath = `${audioBase}.mp3`;
      const fileBuffer = await readFile(audioPath);
      if (fileBuffer.byteLength === 0) {
        throw new Error("Instagram audio extraction produced an empty file.");
      }

      return await this.whisperService.transcribeAudio(audioPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`Instagram transcript acquisition failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private parseUploadDate(value?: string) {
    if (!value || value.length !== 8) {
      throw new Error("Instagram upload date was unavailable from yt-dlp.");
    }

    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }
}
