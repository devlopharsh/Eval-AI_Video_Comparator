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
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let IngestionShellService = class IngestionShellService {
    async commandExists(command) {
        try {
            await execFileAsync(command, ["--version"], { timeout: 15000 });
            return true;
        }
        catch {
            return false;
        }
    }
    async run(command, args, timeout = 120000) {
        const result = await execFileAsync(command, args, {
            timeout,
            maxBuffer: 8 * 1024 * 1024,
        });
        return {
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim(),
        };
    }
};
exports.IngestionShellService = IngestionShellService;
exports.IngestionShellService = IngestionShellService = __decorate([
    (0, common_1.Injectable)()
], IngestionShellService);
