import { Injectable, Logger } from "@nestjs/common";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSummaryFromTranscript, extractHashtags } from "./ingestion.utils";
import { IngestionShellService } from "./ingestion-shell.service";
import type { VideoSeed } from "../../shared/types/ingestion.types";

type YoutubeMetadata = {
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
export class YoutubeProviderService {
  private readonly logger = new Logger(YoutubeProviderService.name);

  constructor(private readonly shellService: IngestionShellService) {}

  async buildSeed(url: string, side: "A" | "B"): Promise<VideoSeed> {
    const metadata = await this.loadMetadata(url);
    const transcript = await this.loadTranscriptWithYtDlp(url);

    return {
      side,
      platform: "YOUTUBE",
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

  private async loadMetadata(url: string): Promise<YoutubeMetadata> {
    const hasYtDlp = await this.shellService.commandExists("yt-dlp");
    if (!hasYtDlp) {
      throw new Error("yt-dlp is required for YouTube metadata ingestion.");
    }

    try {
      const { stdout } = await this.shellService.run("yt-dlp", ["--dump-single-json", url], 120000);
      const payload = JSON.parse(stdout) as {
        title?: string;
        uploader?: string;
        channel?: string;
        channel_follower_count?: number;
        uploader_follower_count?: number;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        thumbnail?: string;
        duration?: number;
        upload_date?: string;
        description?: string;
      };

      if (!payload.title || !(payload.uploader || payload.channel) || !payload.thumbnail || !payload.upload_date) {
        throw new Error("yt-dlp returned incomplete YouTube metadata.");
      }

      return {
        title: payload.title,
        creator: payload.uploader || payload.channel || "",
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
      this.logger.error(`yt-dlp metadata fetch failed for YouTube: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async loadTranscriptWithYtDlp(url: string) {
    const hasYtDlp = await this.shellService.commandExists("yt-dlp");
    if (!hasYtDlp) {
      throw new Error("yt-dlp is required for YouTube transcript ingestion.");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "eval-youtube-"));

    try {
      await this.shellService.run("yt-dlp", [
        "--skip-download",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs",
        "en,en-orig,en-US,en-GB",
        "--sub-format",
        "vtt",
        "-o",
        join(tempDir, "%(id)s.%(ext)s"),
        url,
      ], 180000);

      const files = await readdir(tempDir);
      const subtitleFile = files.find((file) => file.endsWith(".vtt"));
      if (!subtitleFile) {
        throw new Error("No YouTube subtitle file was generated for this video.");
      }

      const content = await readFile(join(tempDir, subtitleFile), "utf8");
      const compact = this.extractTranscriptFromVtt(content);
      if (compact.length <= 80) {
        throw new Error("YouTube transcript extraction returned insufficient text.");
      }

      return compact;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`yt-dlp transcript fetch failed for YouTube: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private parseUploadDate(value?: string) {
    if (!value || value.length !== 8) {
      throw new Error("YouTube upload date was unavailable from yt-dlp.");
    }

    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  private extractTranscriptFromVtt(input: string) {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) {
          return false;
        }

        if (line === "WEBVTT") {
          return false;
        }

        if (/^\d+$/.test(line)) {
          return false;
        }

        if (line.includes("-->")) {
          return false;
        }

        if (line.startsWith("NOTE")) {
          return false;
        }

        return true;
      });

    const deduped: string[] = [];
    for (const line of lines) {
      if (deduped[deduped.length - 1] !== line) {
        deduped.push(line.replace(/<[^>]+>/g, ""));
      }
    }

    return deduped.join(" ").replace(/\s+/g, " ").trim();
  }
}
