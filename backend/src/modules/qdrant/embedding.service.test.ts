import assert from "node:assert/strict";
import test from "node:test";
import { EmbeddingService } from "./embedding.service";

test("embedding service throws when no provider key is configured", async () => {
  const service = new EmbeddingService({
    get: (key: string) => {
      if (key === "openai.apiKey") {
        return "";
      }

      return undefined;
    },
  } as never);

  await assert.rejects(() => service.embedQuery("compare the hooks"), /OPENAI_API_KEY/i);
});
