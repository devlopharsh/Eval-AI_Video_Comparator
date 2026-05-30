"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ingestion_controller_1 = require("./ingestion.controller");
(0, node_test_1.default)("ingestion controller creates a session", async () => {
    const controller = new ingestion_controller_1.IngestionController({
        createIngestionSession: async () => ({
            success: true,
            session_id: "session-123",
            status: "QUEUED",
        }),
    }, {
        getSessionOrThrow: async () => null,
    });
    const result = await controller.ingest({
        video_url_a: "https://youtube.com/watch?v=video-a",
        video_url_b: "https://instagram.com/reel/video-b",
    });
    strict_1.default.equal(result.success, true);
    strict_1.default.equal(result.session_id, "session-123");
});
(0, node_test_1.default)("ingestion controller returns session details", async () => {
    const controller = new ingestion_controller_1.IngestionController({
        createIngestionSession: async () => null,
    }, {
        getSessionOrThrow: async () => ({
            id: "session-abc",
            status: "READY",
            videos: [],
            messages: [],
        }),
    });
    const result = await controller.getSession("session-abc");
    strict_1.default.equal(result.id, "session-abc");
    strict_1.default.equal(result.status, "READY");
});
