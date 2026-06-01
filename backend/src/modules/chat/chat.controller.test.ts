import test from "node:test";
import assert from "node:assert/strict";
import { ChatController } from "./chat.controller";

function createResponseRecorder() {
  const writes: string[] = [];

  return {
    writes,
    setHeader: () => undefined,
    write: (value: string) => {
      writes.push(value);
    },
    end: () => undefined,
  };
}

test("chat controller streams token and completion events", async () => {
  const controller = new ChatController({
    async *streamResponse() {
      yield { event: "token", data: { token: "hello " } };
      yield { event: "complete", data: { message: "hello world", citations: [] } };
    },
  } as never);

  const response = createResponseRecorder();

  await controller.streamChat(
    { session_id: "session-1", message: "hi" },
    response as never,
  );

  assert.equal(response.writes.some((entry) => entry.includes("event: token")), true);
  assert.equal(response.writes.some((entry) => entry.includes("event: complete")), true);
});

test("chat controller streams error events when generation fails", async () => {
  const controller = new ChatController({
    async *streamResponse() {
      throw new Error("Chat generation failed.");
    },
  } as never);

  const response = createResponseRecorder();

  await controller.streamChat(
    { session_id: "session-1", message: "hi" },
    response as never,
  );

  assert.equal(response.writes.some((entry) => entry.includes("event: error")), true);
  assert.equal(response.writes.some((entry) => entry.includes("Chat generation failed.")), true);
});
