import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

@Injectable()
export class IngestionShellService {
  private readonly resolvedCommandCache = new Map<string, string>();

  async commandExists(command: string) {
    try {
      await this.resolveCommand(command);
      return true;
    } catch {
      return false;
    }
  }

  async run(command: string, args: string[], timeout = 120000) {
    const executable = await this.resolveCommand(command);
    const result = await execFileAsync(executable, args, {
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });

    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  }

  private async resolveCommand(command: string) {
    const cached = this.resolvedCommandCache.get(command);
    if (cached) {
      return cached;
    }

    const resolved = await this.resolveCommandUncached(command);
    this.resolvedCommandCache.set(command, resolved);
    return resolved;
  }

  private async resolveCommandUncached(command: string) {
    try {
      await execFileAsync(command, ["--version"], { timeout: 15000 });
      return command;
    } catch {
      if (platform() === "win32") {
        const { stdout } = await execFileAsync("where.exe", [command], {
          timeout: 15000,
          windowsHide: true,
        });
        const resolved = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line.length > 0);

        if (resolved) {
          return resolved;
        }
      }

      throw new Error(`Command was not found or is not executable: ${command}`);
    }
  }
}
