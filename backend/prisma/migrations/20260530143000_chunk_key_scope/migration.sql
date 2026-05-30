DROP INDEX IF EXISTS "TranscriptChunk_chunkKey_key";

CREATE UNIQUE INDEX "TranscriptChunk_videoId_chunkKey_key"
ON "TranscriptChunk"("videoId", "chunkKey");
