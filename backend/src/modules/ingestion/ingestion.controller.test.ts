import test from "node:test";
import assert from "node:assert/strict";
import { IngestionController } from "./ingestion.controller";

test("ingestion controller creates a session", async () => {
  const controller = new IngestionController(
    {
      createIngestionSession: async () => ({
        success: true,
        session_id: "session-123",
        status: "QUEUED",
      }),
    } as never,
    {
      getSessionOrThrow: async () => null,
    } as never,
  );

  const result = await controller.ingest({
    video_url_a: "https://youtube.com/watch?v=video-a",
    video_url_b: "https://instagram.com/reel/video-b",
  });

  assert.equal(result.success, true);
  assert.equal(result.session_id, "session-123");
});

test("ingestion controller returns session details", async () => {
  const controller = new IngestionController(
    {
      createIngestionSession: async () => null,
    } as never,
    {
      getSessionOrThrow: async () => ({
        id: "session-abc",
        status: "READY",
        videos: [],
        messages: [],
      }),
    } as never,
  );

  const result = await controller.getSession("session-abc");

  assert.equal(result.id, "session-abc");
  assert.equal(result.status, "READY");
});
