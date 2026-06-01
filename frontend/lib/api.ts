import type { Citation, VideoInsight } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type SessionStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED";

type SessionResponse = {
  id: string;
  status: SessionStatus;
  failureReason: string | null;
  pipeline: {
    validation: "ready" | "pending" | "failed";
    metadata: "ready" | "pending" | "failed";
    transcript: "ready" | "pending" | "failed";
    vector_store: "ready" | "pending" | "failed";
  };
  latestJob: {
    id: string;
    status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED";
    failureReason: string | null;
  } | null;
  videos: Array<{
    id: string;
    side: "A" | "B";
    platform: "YOUTUBE" | "INSTAGRAM";
    title: string;
    creator: string;
  }>;
  messages: Array<{
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    createdAt: string;
  }>;
};

type VideoResponse = {
  id: string;
  side: "A" | "B";
  platform: "YOUTUBE" | "INSTAGRAM";
  title: string;
  creator: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    engagement_rate: number;
  };
  upload_date: string;
  duration_seconds: number;
  transcript: string;
  transcript_summary: string;
  citations: Array<{
    chunk_id: string;
    timestamp_start: number;
    timestamp_end: number;
  }>;
};

export type ChatCompletePayload = {
  route: "metadata" | "retrieval";
  model: "gpt-4o" | "gpt-4o-mini";
  message: string;
  citations: Citation[];
};

type ChatErrorPayload = {
  message: string;
};

function isChatCompletePayload(payload: unknown): payload is ChatCompletePayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "message" in payload && "route" in payload && "model" in payload && "citations" in payload;
}

function isChatErrorPayload(payload: unknown): payload is ChatErrorPayload {
  return Boolean(payload && typeof payload === "object" && "message" in payload);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) {
    return "Unknown";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function normalizePlatform(platform: VideoResponse["platform"]): VideoInsight["platform"] {
  return platform === "YOUTUBE" ? "YouTube" : "Instagram Reel";
}

function normalizeStatus(status: SessionStatus): VideoInsight["status"] {
  switch (status) {
    case "READY":
      return "ready";
    case "FAILED":
      return "failed";
    case "QUEUED":
      return "queued";
    default:
      return "processing";
  }
}

export function createPipelineState(
  status: SessionStatus,
  hasVideos: boolean,
  pipeline?: SessionResponse["pipeline"],
  latestJob?: SessionResponse["latestJob"],
) {
  const mapState = (state: "ready" | "pending" | "failed" | undefined) => state ?? "pending";
  return [
    {
      label: "URL validation",
      state: mapState(pipeline?.validation),
      detail: "Request accepted and platform-specific URLs validated.",
    },
    {
      label: "Metadata fetch",
      state: mapState(pipeline?.metadata),
      detail: latestJob?.status === "FAILED"
        ? latestJob.failureReason || "Metadata processing failed."
        : "Backend is resolving titles, creators, metrics, and media descriptors.",
    },
    {
      label: "Transcript pipeline",
      state: mapState(pipeline?.transcript),
      detail: "Queue worker is attempting transcript retrieval and provider-backed transcription.",
    },
    {
      label: "Embedding store",
      state: mapState(pipeline?.vector_store ?? (status === "READY" || hasVideos ? "ready" : "pending")),
      detail: "Chunk persistence and vector storage progress are tracked from the backend session state.",
    },
  ] as const;
}

export async function createSession(videoUrlA: string, videoUrlB: string) {
  const response = await fetch(`${API_BASE_URL}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url_a: videoUrlA,
      video_url_b: videoUrlB,
    }),
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (await response.json()) as {
    session_id: string;
    status: SessionStatus;
  };
}

export async function fetchSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/ingest/session/${sessionId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (await response.json()) as SessionResponse;
}

export function mapSessionMessagesToChat(
  messages: SessionResponse["messages"],
) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    markdown: message.content,
  })) as Array<{ id: string; role: "user" | "assistant"; markdown: string }>;
}

export async function fetchVideo(id: string, sessionStatus: SessionStatus): Promise<VideoInsight> {
  const response = await fetch(`${API_BASE_URL}/video/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  const video = (await response.json()) as VideoResponse;
  const citations = video.citations.slice(0, 2).map((citation) => ({
    source: video.side === "A" ? "Video A" : "Video B",
    chunkId: citation.chunk_id,
    timestamp: `${formatTimestamp(citation.timestamp_start)}-${formatTimestamp(citation.timestamp_end)}`,
  })) as Citation[];

  const summary = video.transcript_summary.trim();

  return {
    id: video.side,
    sourceLabel: video.side === "A" ? "Video A" : "Video B",
    platform: normalizePlatform(video.platform),
    title: video.title,
    creator: video.creator,
    status: normalizeStatus(sessionStatus),
    views: formatCompactNumber(video.metrics.views),
    viewsValue: video.metrics.views,
    likes: formatCompactNumber(video.metrics.likes),
    likesValue: video.metrics.likes,
    comments: formatCompactNumber(video.metrics.comments),
    commentsValue: video.metrics.comments,
    engagementRate: `${video.metrics.engagement_rate}%`,
    engagementValue: video.metrics.engagement_rate,
    duration: formatDuration(video.duration_seconds),
    uploadDate: formatDate(video.upload_date),
    hookSummary: summary,
    narrativeSummary: summary,
    transcriptExcerpt: video.transcript.slice(0, 180).trimEnd() + (video.transcript.length > 180 ? "..." : ""),
    citations,
  };
}

export async function streamChat(
  sessionId: string,
  message: string,
  handlers: {
    onToken: (token: string) => void;
    onComplete: (payload: ChatCompletePayload) => void;
  },
) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(await extractError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let sawComplete = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data) {
        continue;
      }

      const payload = JSON.parse(data) as
        | { token: string }
        | ChatCompletePayload
        | ChatErrorPayload;

      if (currentEvent === "token" && "token" in payload) {
        handlers.onToken(payload.token);
      }

      if (currentEvent === "complete" && isChatCompletePayload(payload)) {
        sawComplete = true;
        handlers.onComplete(payload);
      }

      if (currentEvent === "error" && isChatErrorPayload(payload)) {
        throw new Error(payload.message);
      }
    }
  }

  if (!sawComplete) {
    throw new Error("Chat stream ended before a response was completed.");
  }
}

async function extractError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message || payload.error || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}
