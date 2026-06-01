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
var InstagramProviderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramProviderService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const ingestion_utils_1 = require("./ingestion.utils");
const ingestion_shell_service_1 = require("./ingestion-shell.service");
const openai_whisper_service_1 = require("./openai-whisper.service");
let InstagramProviderService = InstagramProviderService_1 = class InstagramProviderService {
    constructor(configService, shellService, whisperService) {
        this.configService = configService;
        this.shellService = shellService;
        this.whisperService = whisperService;
        this.logger = new common_1.Logger(InstagramProviderService_1.name);
    }
    async buildSeed(url, side) {
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
            hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : (0, ingestion_utils_1.extractHashtags)(transcript),
            transcript,
            transcriptSummary: (0, ingestion_utils_1.buildSummaryFromTranscript)(transcript),
            thumbnailUrl: metadata.thumbnailUrl,
        };
    }
    async loadMetadata(url) {
        const hasYtDlp = await this.shellService.commandExists("yt-dlp");
        if (!hasYtDlp) {
            throw new Error("yt-dlp is required for Instagram metadata ingestion.");
        }
        try {
            const { stdout } = await this.shellService.run("yt-dlp", [...this.buildYtDlpArgs(), "--dump-single-json", url], 120000);
            const payload = JSON.parse(stdout);
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
                hashtags: (0, ingestion_utils_1.extractHashtags)(payload.description || ""),
                captionText: (payload.description || "").trim(),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`yt-dlp metadata fetch failed for Instagram: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
    }
    async loadTranscript(url) {
        const hasYtDlp = await this.shellService.commandExists("yt-dlp");
        if (!hasYtDlp) {
            throw new Error("yt-dlp is required for Instagram transcript ingestion.");
        }
        const hasFfmpeg = await this.shellService.commandExists("ffmpeg");
        if (!hasFfmpeg) {
            throw new Error("ffmpeg is required for Instagram transcript ingestion.");
        }
        const tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "eval-instagram-"));
        const audioBase = (0, node_path_1.join)(tempDir, "source");
        const monoAudioPath = (0, node_path_1.join)(tempDir, "source.mono.wav");
        try {
            const { stdout } = await this.shellService.run("yt-dlp", [...this.buildYtDlpArgs(), "-x", "--audio-format", "wav", "--print", "after_move:filepath", "-o", audioBase, url], 180000);
            const audioPath = this.extractDownloadedAudioPath(stdout, audioBase);
            await this.shellService.run("ffmpeg", ["-y", "-i", audioPath, "-ac", "1", "-ar", "16000", monoAudioPath], 180000);
            const fileBuffer = await (0, promises_1.readFile)(monoAudioPath);
            if (fileBuffer.byteLength === 0) {
                throw new Error("Instagram audio extraction produced an empty file.");
            }
            return await this.whisperService.transcribeAudio(monoAudioPath);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`Instagram transcript acquisition failed: ${message}`);
            throw error instanceof Error ? error : new Error(message);
        }
        finally {
            await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
        }
    }
    async loadTranscriptWithFallback(url, metadata) {
        try {
            return await this.loadTranscript(url);
        }
        catch (error) {
            const fallback = this.buildTranscriptFallback(metadata);
            if (!fallback) {
                throw error instanceof Error ? error : new Error("Instagram transcript acquisition failed.");
            }
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.warn(`Falling back to Instagram metadata text because audio transcription failed: ${message}`);
            return fallback;
        }
    }
    parseUploadDate(value) {
        if (!value || value.length !== 8) {
            throw new Error("Instagram upload date was unavailable from yt-dlp.");
        }
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    buildTranscriptFallback(metadata) {
        const parts = [metadata.title.trim(), metadata.captionText.trim()]
            .filter((value) => value.length > 0)
            .filter((value, index, values) => values.indexOf(value) === index);
        if (parts.length === 0 && metadata.hashtags.length > 0) {
            parts.push(metadata.hashtags.map((tag) => `#${tag}`).join(" "));
        }
        return parts.join(". ").trim();
    }
    buildYtDlpArgs() {
        const args = ["--no-playlist"];
        const cookiesFile = this.configService.get("YTDLP_COOKIES_FILE") || process.env.YTDLP_COOKIES_FILE;
        if (cookiesFile?.trim()) {
            args.push("--cookies", cookiesFile.trim());
        }
        return args;
    }
    extractDownloadedAudioPath(stdout, audioBase) {
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
};
exports.InstagramProviderService = InstagramProviderService;
exports.InstagramProviderService = InstagramProviderService = InstagramProviderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ingestion_shell_service_1.IngestionShellService,
        openai_whisper_service_1.OpenAiWhisperService])
], InstagramProviderService);
