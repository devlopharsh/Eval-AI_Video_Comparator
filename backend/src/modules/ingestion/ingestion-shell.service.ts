import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

@Injectable()
export class IngestionShellService {
  async commandExists(command: string) {
    try {
      await execFileAsync(command, ["--version"], { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async run(command: string, args: string[], timeout = 120000) {
    const result = await execFileAsync(command, args, {
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });

    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  }
}
