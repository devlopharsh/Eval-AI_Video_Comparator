"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const chat_controller_1 = require("./chat.controller");
function createResponseRecorder() {
    const writes = [];
    return {
        writes,
        setHeader: () => undefined,
        write: (value) => {
            writes.push(value);
        },
        end: () => undefined,
    };
}
(0, node_test_1.default)("chat controller streams token and completion events", async () => {
    const controller = new chat_controller_1.ChatController({
        async *streamResponse() {
            yield { event: "token", data: { token: "hello " } };
            yield { event: "complete", data: { message: "hello world", citations: [] } };
        },
    });
    const response = createResponseRecorder();
    await controller.streamChat({ session_id: "session-1", message: "hi" }, response);
    strict_1.default.equal(response.writes.some((entry) => entry.includes("event: token")), true);
    strict_1.default.equal(response.writes.some((entry) => entry.includes("event: complete")), true);
});
(0, node_test_1.default)("chat controller streams error events when generation fails", async () => {
    const controller = new chat_controller_1.ChatController({
        async *streamResponse() {
            throw new Error("Chat generation failed.");
        },
    });
    const response = createResponseRecorder();
    await controller.streamChat({ session_id: "session-1", message: "hi" }, response);
    strict_1.default.equal(response.writes.some((entry) => entry.includes("event: error")), true);
    strict_1.default.equal(response.writes.some((entry) => entry.includes("Chat generation failed.")), true);
});
