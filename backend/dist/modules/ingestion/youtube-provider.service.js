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
var YoutubeProviderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeProviderService = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const ingestion_utils_1 = require("./ingestion.utils");
const ingestion_shell_service_1 = require("./ingestion-shell.service");
let YoutubeProviderService = YoutubeProviderService_1 = class YoutubeProviderService {
    constructor(shellService) {
        this.shellService = shellService;
        this.logger = new common_1.Logger(YoutubeProviderService_1.name);
    }
    async buildSeed(url, side) {
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
            hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : (0, ingestion_utils_1.extractHashtags)(transcript),
            transcript,
            transcriptSummary: (0, ingestion_utils_1.buildSummaryFromTranscript)(transcript),
            thumbnailUrl: metadata.thumbnailUrl,
        };
    }
    async loadMetadata(url) {
        const hasYtDlp = await this.shellService.commandExists("yt-dlp");
        if (!hasYtDlp) {
            throw new Error("yt-dlp is required for YouTube metadata ingestion.");
        }
        try {
            const { stdout } = await this.shellService.run("yt-dlp", [...this.buildYtDlpBaseArgs(), "--dump-single-json", url], 120000);
            const payload = JSON.parse(stdout);
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
                hashtags: (0, ingestion_utils_1.extractHashtags)(payload.description || ""),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`yt-dlp metadata fetch failed for YouTube: ${message}`);
            if (message.includes("Sign in to confirm you're not a bot")) {
                throw new Error("YouTube blocked anonymous metadata extraction for this video. Configure yt-dlp cookies or test a different video/network.");
            }
            throw error instanceof Error ? error : new Error(message);
        }
    }
    async loadTranscriptWithYtDlp(url) {
        const hasYtDlp = await this.shellService.commandExists("yt-dlp");
        if (!hasYtDlp) {
            throw new Error("yt-dlp is required for YouTube transcript ingestion.");
        }
        const tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "eval-youtube-"));
        try {
            await this.shellService.run("yt-dlp", [
                ...this.buildYtDlpBaseArgs(),
                "--skip-download",
                "--write-auto-subs",
                "--write-subs",
                "--sub-langs",
                "en,en-orig,en-US,en-GB",
                "--sub-format",
                "vtt",
                "-o",
                (0, node_path_1.join)(tempDir, "%(id)s.%(ext)s"),
                url,
            ], 180000);
            const files = await (0, promises_1.readdir)(tempDir);
            const subtitleFile = files.find((file) => file.endsWith(".vtt"));
            if (!subtitleFile) {
                throw new Error("No YouTube subtitle file was generated for this video.");
            }
            const content = await (0, promises_1.readFile)((0, node_path_1.join)(tempDir, subtitleFile), "utf8");
            const compact = this.extractTranscriptFromVtt(content);
            if (compact.length <= 80) {
                throw new Error("YouTube transcript extraction returned insufficient text.");
            }
            return compact;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`yt-dlp transcript fetch failed for YouTube: ${message}`);
            if (message.includes("HTTP Error 429")) {
                throw new Error("YouTube subtitle retrieval was rate-limited (HTTP 429). Retry later or test another video/network.");
            }
            if (message.includes("Sign in to confirm you're not a bot")) {
                throw new Error("YouTube blocked anonymous subtitle retrieval for this video. Configure yt-dlp cookies or test a different video/network.");
            }
            throw error instanceof Error ? error : new Error(message);
        }
        finally {
            await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
        }
    }
    parseUploadDate(value) {
        if (!value || value.length !== 8) {
            throw new Error("YouTube upload date was unavailable from yt-dlp.");
        }
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    extractTranscriptFromVtt(input) {
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
        const deduped = [];
        for (const line of lines) {
            if (deduped[deduped.length - 1] !== line) {
                deduped.push(line.replace(/<[^>]+>/g, ""));
            }
        }
        return deduped.join(" ").replace(/\s+/g, " ").trim();
    }
    buildYtDlpBaseArgs() {
        const args = ["--js-runtimes", "node", "--remote-components", "ejs:github"];
        const cookiesPath = process.env.YTDLP_COOKIES_FILE?.trim();
        if (cookiesPath) {
            args.push("--cookies", cookiesPath);
        }
        return args;
    }
};
exports.YoutubeProviderService = YoutubeProviderService;
exports.YoutubeProviderService = YoutubeProviderService = YoutubeProviderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ingestion_shell_service_1.IngestionShellService])
], YoutubeProviderService);
