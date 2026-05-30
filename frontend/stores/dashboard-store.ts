"use client";

import { create } from "zustand";
import {
  createPipelineState,
  type ChatCompletePayload,
  createSession,
  fetchSession,
  fetchVideo,
  mapSessionMessagesToChat,
  streamChat,
} from "@/lib/api";
import { initialMessages, type ChatMessage, type VideoInsight } from "@/lib/mock-data";

const SESSION_STORAGE_KEY = "eval-active-session";

type SessionStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED" | null;

type DashboardState = {
  videoUrlA: string;
  videoUrlB: string;
  chatInput: string;
  messages: ChatMessage[];
  sessionId: string | null;
  sessionStatus: SessionStatus;
  videos: VideoInsight[];
  error: string | null;
  isSubmitting: boolean;
  isStreaming: boolean;
  isRestoring: boolean;
  pipelineState: ReturnType<typeof createPipelineState>;
  pollingId: number | null;
  setVideoUrlA: (value: string) => void;
  setVideoUrlB: (value: string) => void;
  setChatInput: (value: string) => void;
  restoreSession: () => Promise<void>;
  stopPolling: () => void;
  clearSession: () => void;
  handleIngest: () => Promise<void>;
  runStream: (prompt: string) => Promise<void>;
  loadSessionState: (
    nextSessionId: string,
    options?: { restoreMessages?: boolean },
  ) => Promise<void>;
};

function stopPolling(pollingId: number | null) {
  if (pollingId) {
    window.clearInterval(pollingId);
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  videoUrlA: "",
  videoUrlB: "",
  chatInput: "",
  messages: initialMessages,
  sessionId: null,
  sessionStatus: null,
  videos: [],
  error: null,
  isSubmitting: false,
  isStreaming: false,
  isRestoring: true,
  pipelineState: createPipelineState("QUEUED", false),
  pollingId: null,
  setVideoUrlA: (value) => set({ videoUrlA: value }),
  setVideoUrlB: (value) => set({ videoUrlB: value }),
  setChatInput: (value) => set({ chatInput: value }),
  restoreSession: async () => {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      set({ isRestoring: false });
      return;
    }

    const parsed = JSON.parse(stored) as {
      sessionId: string;
      videoUrlA?: string;
      videoUrlB?: string;
      youtubeUrl?: string;
      instagramUrl?: string;
    };

    set({
      sessionId: parsed.sessionId,
      videoUrlA: parsed.videoUrlA ?? parsed.youtubeUrl ?? "",
      videoUrlB: parsed.videoUrlB ?? parsed.instagramUrl ?? "",
    });

    try {
      await get().loadSessionState(parsed.sessionId, { restoreMessages: true });
    } finally {
      set({ isRestoring: false });
    }
  },
  stopPolling: () => {
    stopPolling(get().pollingId);
    set({ pollingId: null });
  },
  clearSession: () => {
    get().stopPolling();
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    set({
      sessionId: null,
      sessionStatus: null,
      videos: [],
      error: null,
      messages: initialMessages,
      pipelineState: createPipelineState("QUEUED", false),
      pollingId: null,
      chatInput: "",
    });
  },
  loadSessionState: async (nextSessionId, options) => {
    const session = await fetchSession(nextSessionId);
    set({
      sessionStatus: session.status,
      pipelineState: createPipelineState(
        session.status,
        session.videos.length > 0,
        session.pipeline,
        session.latestJob,
      ),
    });

    if (options?.restoreMessages && session.messages.length > 0) {
      set({ messages: mapSessionMessagesToChat(session.messages) });
    }

    if (session.status === "READY" && session.videos.length > 0) {
      const loadedVideos = await Promise.all(
        session.videos.map((video) => fetchVideo(video.id, session.status)),
      );
      loadedVideos.sort((left, right) => left.id.localeCompare(right.id));

      stopPolling(get().pollingId);
      set({
        videos: loadedVideos,
        error: null,
        pollingId: null,
      });
      return;
    }

    if (session.status === "FAILED") {
      stopPolling(get().pollingId);
      set({
        error: session.failureReason || "Ingestion failed.",
        pollingId: null,
      });
    }
  },
  handleIngest: async () => {
    if (get().isSubmitting) {
      return;
    }

    const { videoUrlA, videoUrlB } = get();
    stopPolling(get().pollingId);
    set({
      isSubmitting: true,
      error: null,
      videos: [],
      sessionStatus: "QUEUED",
      messages: initialMessages,
      pipelineState: createPipelineState("QUEUED", false),
      pollingId: null,
    });

    try {
      const response = await createSession(videoUrlA, videoUrlB);
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          sessionId: response.session_id,
          videoUrlA,
          videoUrlB,
        }),
      );

      set({
        sessionId: response.session_id,
        sessionStatus: response.status,
      });

      await get().loadSessionState(response.session_id);

      if (get().sessionStatus !== "READY" && get().sessionStatus !== "FAILED") {
        const intervalId = window.setInterval(() => {
          void get().loadSessionState(response.session_id).catch((reason: unknown) => {
            set({
              error:
                reason instanceof Error
                  ? reason.message
                  : "Failed to refresh session state.",
            });
          });
        }, 2500);

        set({ pollingId: intervalId });
      }
    } catch (reason) {
      set({
        error:
          reason instanceof Error
            ? reason.message
            : "Failed to create ingestion session.",
      });
    } finally {
      set({ isSubmitting: false });
    }
  },
  runStream: async (prompt) => {
    const { isStreaming, sessionId, sessionStatus, messages } = get();
    if (isStreaming || !sessionId || sessionStatus !== "READY") {
      return;
    }

    const answerId = crypto.randomUUID();
    set({
      messages: [
        ...messages,
        { id: crypto.randomUUID(), role: "user", markdown: prompt },
        { id: answerId, role: "assistant", markdown: "", citations: [] },
      ],
      chatInput: "",
      isStreaming: true,
    });

    try {
      await streamChat(sessionId, prompt, {
        onToken: (token) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === answerId
                ? { ...message, markdown: `${message.markdown}${token}` }
                : message,
            ),
          }));
        },
        onComplete: (payload) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === answerId
                ? {
                    ...message,
                    markdown: payload.message,
                    citations: payload.citations,
                    route: payload.route,
                    model: payload.model,
                    sourceVideos: Array.from(
                      new Set(payload.citations.map((citation) => citation.source)),
                    ) as Array<"Video A" | "Video B">,
                  }
                : message,
            ),
          }));
        },
      });
    } catch (reason) {
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === answerId
            ? {
                ...message,
                markdown:
                  reason instanceof Error
                    ? reason.message
                    : "Streaming request failed unexpectedly.",
              }
            : message,
        ),
      }));
    } finally {
      set({ isStreaming: false });
    }
  },
}));
