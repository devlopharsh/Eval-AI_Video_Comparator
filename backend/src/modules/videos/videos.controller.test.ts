import test from "node:test";
import assert from "node:assert/strict";
import { VideosController } from "./videos.controller";

test("videos controller returns video details", async () => {
  const controller = new VideosController(
    {
      getVideoDetails: async () => ({
        id: "video-1",
        title: "Demo Video",
      }),
    } as never,
  );

  const result = await controller.getVideo("video-1");

  assert.equal(result.id, "video-1");
  assert.equal(result.title, "Demo Video");
});
