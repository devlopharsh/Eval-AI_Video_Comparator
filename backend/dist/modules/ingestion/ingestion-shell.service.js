"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionShellService = void 0;
const common_1 = require("@nestjs/common");
const node_child_process_1 = require("node:child_process");
const node_os_1 = require("node:os");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let IngestionShellService = class IngestionShellService {
    constructor() {
        this.resolvedCommandCache = new Map();
    }
    async commandExists(command) {
        try {
            await this.resolveCommand(command);
            return true;
        }
        catch {
            return false;
        }
    }
    async run(command, args, timeout = 120000) {
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
    async resolveCommand(command) {
        const cached = this.resolvedCommandCache.get(command);
        if (cached) {
            return cached;
        }
        const resolved = await this.resolveCommandUncached(command);
        this.resolvedCommandCache.set(command, resolved);
        return resolved;
    }
    async resolveCommandUncached(command) {
        try {
            await execFileAsync(command, ["--version"], { timeout: 15000 });
            return command;
        }
        catch {
            if ((0, node_os_1.platform)() === "win32") {
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
};
exports.IngestionShellService = IngestionShellService;
exports.IngestionShellService = IngestionShellService = __decorate([
    (0, common_1.Injectable)()
], IngestionShellService);
