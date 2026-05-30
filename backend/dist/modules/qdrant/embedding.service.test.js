"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const embedding_service_1 = require("./embedding.service");
(0, node_test_1.default)("embedding service throws when no provider key is configured", async () => {
    const service = new embedding_service_1.EmbeddingService({
        get: (key) => {
            if (key === "openai.apiKey") {
                return "";
            }
            return undefined;
        },
    });
    await strict_1.default.rejects(() => service.embedQuery("compare the hooks"), /OPENAI_API_KEY/i);
});
