import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
  captionText: string;
};

@Injectable()
export class InstagramProviderService {
  private readonly logger = new Logger(InstagramProviderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly shellService: IngestionShellService,
    private readonly whisperService: OpenAiWhisperService,
  ) {}

  async buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed> {
    const metadata = await this.loadMetadata(url);
    const transcript = await this.loadTranscriptWithFallback(url, metadata);

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
      const { stdout } = await this.shellService.run("yt-dlp", [...this.buildYtDlpArgs(), "--dump-single-json", url], 120000);
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
        captionText: (payload.description || "").trim(),
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
    const hasFfmpeg = await this.shellService.commandExists("ffmpeg");
    if (!hasFfmpeg) {
      throw new Error("ffmpeg is required for Instagram transcript ingestion.");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "eval-instagram-"));
    const audioBase = join(tempDir, "source");
    const monoAudioPath = join(tempDir, "source.mono.wav");

    try {
      const { stdout } = await this.shellService.run(
        "yt-dlp",
        [...this.buildYtDlpArgs(), "-x", "--audio-format", "wav", "--print", "after_move:filepath", "-o", audioBase, url],
        180000,
      );
      const audioPath = this.extractDownloadedAudioPath(stdout, audioBase);
      await this.shellService.run(
        "ffmpeg",
        ["-y", "-i", audioPath, "-ac", "1", "-ar", "16000", monoAudioPath],
        180000,
      );

      const fileBuffer = await readFile(monoAudioPath);
      if (fileBuffer.byteLength === 0) {
        throw new Error("Instagram audio extraction produced an empty file.");
      }

      return await this.whisperService.transcribeAudio(monoAudioPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`Instagram transcript acquisition failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async loadTranscriptWithFallback(url: string, metadata: InstagramMetadata) {
    try {
      return await this.loadTranscript(url);
    } catch (error) {
      const fallback = this.buildTranscriptFallback(metadata);
      if (!fallback) {
        throw error instanceof Error ? error : new Error("Instagram transcript acquisition failed.");
      }

      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Falling back to Instagram metadata text because audio transcription failed: ${message}`);
      return fallback;
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

  private buildTranscriptFallback(metadata: InstagramMetadata) {
    const parts = [metadata.title.trim(), metadata.captionText.trim()]
      .filter((value) => value.length > 0)
      .filter((value, index, values) => values.indexOf(value) === index);

    if (parts.length === 0 && metadata.hashtags.length > 0) {
      parts.push(metadata.hashtags.map((tag) => `#${tag}`).join(" "));
    }

    return parts.join(". ").trim();
  }

  private buildYtDlpArgs() {
    const args = ["--no-playlist"] as string[];
    const cookiesFile = this.configService.get<string>("YTDLP_COOKIES_FILE") || process.env.YTDLP_COOKIES_FILE;

    if (cookiesFile?.trim()) {
      args.push("--cookies", cookiesFile.trim());
    }

    return args;
  }

  private extractDownloadedAudioPath(stdout: string, audioBase: string) {
    const printedPath = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .at(-1);

    if (printedPath) {
      return printedPath;
    }

    return `${audioBase}.wav`;
  }
}
