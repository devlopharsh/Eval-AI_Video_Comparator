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
var OpenAiWhisperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiWhisperService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const ingestion_shell_service_1 = require("./ingestion-shell.service");
let OpenAiWhisperService = OpenAiWhisperService_1 = class OpenAiWhisperService {
    constructor(configService, shellService) {
        this.configService = configService;
        this.shellService = shellService;
        this.logger = new common_1.Logger(OpenAiWhisperService_1.name);
    }
    async transcribeAudio(filePath) {
        const apiKey = this.configService.get("transcription.apiKey") ||
            this.configService.get("providers.openAiApiKey");
        if (!apiKey) {
            throw new Error("Transcription provider is not configured. Set TRANSCRIPTION_API_KEY (preferred) or OPENAI_API_KEY before ingesting audio-only sources.");
        }
        const baseUrl = this.configService.get("transcription.baseUrl") ||
            this.configService.get("openai.baseUrl") ||
            "https://api.openai.com/v1";
        const model = this.configService.get("transcription.model") ?? "whisper-1";
        const provider = (this.configService.get("transcription.provider") ?? "").trim().toLowerCase();
        if (provider === "nvidia" || baseUrl.includes("integrate.api.nvidia.com")) {
            return this.transcribeWithNvidia(filePath, apiKey);
        }
        const bytes = await (0, promises_1.readFile)(filePath);
        const formData = new FormData();
        formData.append("model", model);
        formData.append("response_format", "verbose_json");
        formData.append("file", new File([bytes], this.getUploadFileName(filePath), { type: this.getUploadContentType(filePath) }));
        const response = await fetch(`${baseUrl}/audio/transcriptions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`Whisper transcription failed: ${response.status} ${errorText}`);
            throw new Error(`Whisper transcription failed: ${response.status} ${errorText}`);
        }
        const payload = (await response.json());
        const transcript = payload.text?.trim();
        if (!transcript) {
            throw new Error("Whisper transcription returned no transcript text.");
        }
        return transcript;
    }
    async transcribeWithNvidia(filePath, apiKey) {
        const pythonCommand = await this.resolvePythonCommand();
        const scriptPath = (0, node_path_1.join)(process.cwd(), "scripts", "nvidia_transcribe.py");
        const server = this.configService.get("transcription.nvidiaServer") ?? "grpc.nvcf.nvidia.com:443";
        const functionId = this.configService.get("transcription.nvidiaFunctionId") ?? "b702f636-f60c-4a3d-a6f4-f3568c13bd7d";
        const languageCode = this.configService.get("transcription.languageCode") ?? "multi";
        try {
            const { stdout } = await this.shellService.run(pythonCommand, [scriptPath, "--input-file", filePath, "--api-key", apiKey, "--server", server, "--function-id", functionId, "--language-code", languageCode], 300000);
            const transcript = stdout.trim();
            if (!transcript) {
                throw new Error("NVIDIA ASR returned no transcript text.");
            }
            return transcript;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.error(`NVIDIA transcription failed: ${message}`);
            if (message.includes("ModuleNotFoundError: No module named 'riva'")) {
                throw new Error("The Python environment used by the backend does not have nvidia-riva-client installed. Install it with `python -m pip install nvidia-riva-client` for manual local runs, or use the Docker backend image which already includes it.");
            }
            if (message.includes("Input audio channel count must be 1")) {
                throw new Error("NVIDIA ASR rejected the audio because it was not mono. The backend now expects ffmpeg to normalize Instagram audio to single-channel WAV before transcription.");
            }
            throw error instanceof Error ? error : new Error(message);
        }
    }
    async resolvePythonCommand() {
        if (await this.shellService.commandExists("python")) {
            if (await this.canImportRiva("python")) {
                return "python";
            }
        }
        if (await this.shellService.commandExists("python3")) {
            if (await this.canImportRiva("python3")) {
                return "python3";
            }
        }
        throw new Error("No usable Python interpreter with nvidia-riva-client was found for NVIDIA ASR transcription. Install `nvidia-riva-client` into the Python interpreter on PATH, or run the backend through the Docker image.");
    }
    async canImportRiva(pythonCommand) {
        try {
            await this.shellService.run(pythonCommand, ["-c", "import riva.client"], 20000);
            return true;
        }
        catch {
            return false;
        }
    }
    getUploadFileName(filePath) {
        return filePath.split(/[\\/]/).at(-1) || "audio.wav";
    }
    getUploadContentType(filePath) {
        const normalized = filePath.toLowerCase();
        if (normalized.endsWith(".wav")) {
            return "audio/wav";
        }
        if (normalized.endsWith(".mp3")) {
            return "audio/mpeg";
        }
        if (normalized.endsWith(".m4a")) {
            return "audio/mp4";
        }
        return "application/octet-stream";
    }
};
exports.OpenAiWhisperService = OpenAiWhisperService;
exports.OpenAiWhisperService = OpenAiWhisperService = OpenAiWhisperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ingestion_shell_service_1.IngestionShellService])
], OpenAiWhisperService);
