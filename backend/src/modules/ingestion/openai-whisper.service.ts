import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { IngestionShellService } from "./ingestion-shell.service";

@Injectable()
export class OpenAiWhisperService {
  private readonly logger = new Logger(OpenAiWhisperService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly shellService: IngestionShellService,
  ) {}

  async transcribeAudio(filePath: string) {
    const apiKey =
      this.configService.get<string>("transcription.apiKey") ||
      this.configService.get<string>("providers.openAiApiKey");
    if (!apiKey) {
      throw new Error(
        "Transcription provider is not configured. Set TRANSCRIPTION_API_KEY (preferred) or OPENAI_API_KEY before ingesting audio-only sources.",
      );
    }

    const baseUrl =
      this.configService.get<string>("transcription.baseUrl") ||
      this.configService.get<string>("openai.baseUrl") ||
      "https://api.openai.com/v1";
    const model = this.configService.get<string>("transcription.model") ?? "whisper-1";
    const provider = (this.configService.get<string>("transcription.provider") ?? "").trim().toLowerCase();

    if (provider === "nvidia" || baseUrl.includes("integrate.api.nvidia.com")) {
      return this.transcribeWithNvidia(filePath, apiKey);
    }

    const bytes = await readFile(filePath);
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

    const payload = (await response.json()) as { text?: string };
    const transcript = payload.text?.trim();
    if (!transcript) {
      throw new Error("Whisper transcription returned no transcript text.");
    }

    return transcript;
  }

  private async transcribeWithNvidia(filePath: string, apiKey: string) {
    const pythonCommand = await this.resolvePythonCommand();
    const scriptPath = join(process.cwd(), "scripts", "nvidia_transcribe.py");
    const server = this.configService.get<string>("transcription.nvidiaServer") ?? "grpc.nvcf.nvidia.com:443";
    const functionId =
      this.configService.get<string>("transcription.nvidiaFunctionId") ?? "b702f636-f60c-4a3d-a6f4-f3568c13bd7d";
    const languageCode = this.configService.get<string>("transcription.languageCode") ?? "multi";

    try {
      const { stdout } = await this.shellService.run(
        pythonCommand,
        [scriptPath, "--input-file", filePath, "--api-key", apiKey, "--server", server, "--function-id", functionId, "--language-code", languageCode],
        300000,
      );

      const transcript = stdout.trim();
      if (!transcript) {
        throw new Error("NVIDIA ASR returned no transcript text.");
      }

      return transcript;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`NVIDIA transcription failed: ${message}`);
      if (message.includes("ModuleNotFoundError: No module named 'riva'")) {
        throw new Error(
          "The Python environment used by the backend does not have nvidia-riva-client installed. Install it with `python -m pip install nvidia-riva-client` for manual local runs, or use the Docker backend image which already includes it.",
        );
      }
      if (message.includes("Input audio channel count must be 1")) {
        throw new Error(
          "NVIDIA ASR rejected the audio because it was not mono. The backend now expects ffmpeg to normalize Instagram audio to single-channel WAV before transcription.",
        );
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async resolvePythonCommand() {
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

    throw new Error(
      "No usable Python interpreter with nvidia-riva-client was found for NVIDIA ASR transcription. Install `nvidia-riva-client` into the Python interpreter on PATH, or run the backend through the Docker image.",
    );
  }

  private async canImportRiva(pythonCommand: string) {
    try {
      await this.shellService.run(pythonCommand, ["-c", "import riva.client"], 20000);
      return true;
    } catch {
      return false;
    }
  }

  private getUploadFileName(filePath: string) {
    return filePath.split(/[\\/]/).at(-1) || "audio.wav";
  }

  private getUploadContentType(filePath: string) {
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
}
