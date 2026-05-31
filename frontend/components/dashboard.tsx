"use client";

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  ClipboardPaste,
  Loader2,
  MessageSquareText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { promptIdeas, type Citation, type VideoInsight } from "@/lib/mock-data";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function formatCitations(citations: Citation[] | undefined) {
  if (!citations?.length) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {citations.map((citation) => (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-xs text-[color:var(--muted-foreground)]"
          key={`${citation.chunkId}-${citation.timestamp}`}
        >
          <span className="font-medium text-[color:var(--foreground)]">
            {citation.source}
          </span>
          <span>
            {citation.chunkId} | {citation.timestamp}
          </span>
        </div>
      ))}
    </div>
  );
}

function getSessionBadge(
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED" | null,
) {
  if (status === "READY") {
    return "success" as const;
  }

  if (status === "FAILED") {
    return "danger" as const;
  }

  if (status === "QUEUED" || status === "PROCESSING") {
    return "warning" as const;
  }

  return "default" as const;
}

function summarizeBackendResponse(
  message:
    | {
        role: "user" | "assistant";
        route?: "metadata" | "retrieval";
        model?: string;
        citations?: Citation[];
        sourceVideos?: Array<"Video A" | "Video B">;
      }
    | undefined,
) {
  if (!message || message.role !== "assistant") {
    return null;
  }

  const routeLabel =
    message.route === "metadata"
      ? "Metadata answer"
      : message.route === "retrieval"
        ? "Retrieval answer"
        : "Awaiting backend reply";

  const evidenceLabel =
    message.citations && message.citations.length > 0
      ? `${message.citations.length} citation${message.citations.length > 1 ? "s" : ""}`
      : "No citations yet";

  const sourceLabel =
    message.sourceVideos && message.sourceVideos.length > 0
      ? message.sourceVideos.join(" + ")
      : "No source mix yet";

  return {
    routeLabel,
    evidenceLabel,
    sourceLabel,
    modelLabel: message.model ?? "Model pending",
    confidenceTone:
      message.citations && message.citations.length > 0
        ? "Grounded by backend evidence"
        : "Waiting for grounded evidence",
  };
}

function getVideoStrength(videos: VideoInsight[]) {
  if (videos.length < 2) {
    return null;
  }

  const [videoA, videoB] = videos;
  const score = (video: VideoInsight) =>
    video.viewsValue / 250000 +
    video.likesValue / 25000 +
    video.commentsValue / 5000 +
    video.engagementValue / 15;

  const scoreA = score(videoA);
  const scoreB = score(videoB);

  if (Math.abs(scoreA - scoreB) < 0.05) {
    return {
      leader: null,
      message: "Both videos are performing at a similar overall strength right now.",
    };
  }

  const leader = scoreA > scoreB ? videoA : videoB;
  const follower = scoreA > scoreB ? videoB : videoA;

  return {
    leader,
    follower,
    message: `${leader.sourceLabel} currently shows stronger overall popularity and performance than ${follower.sourceLabel}.`,
  };
}

function MetricRadarChart({ video }: { video: VideoInsight }) {
  const metrics = [
    {
      label: "Views",
      raw: video.viewsValue,
      display: video.views,
      max: 250000,
    },
    { label: "Likes", raw: video.likesValue, display: video.likes, max: 25000 },
    {
      label: "Comments",
      raw: video.commentsValue,
      display: video.comments,
      max: 5000,
    },
    {
      label: "Engagement",
      raw: video.engagementValue,
      display: video.engagementRate,
      max: 15,
    },
  ];
  const cx = 170;
  const cy = 132;
  const radius = 88;
  const angleStep = (Math.PI * 2) / metrics.length;

  const axisPoints = metrics.map((metric, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const scale = Math.min(metric.raw / metric.max, 1);
    const outerX = cx + Math.cos(angle) * radius;
    const outerY = cy + Math.sin(angle) * radius;
    const valueX = cx + Math.cos(angle) * radius * scale;
    const valueY = cy + Math.sin(angle) * radius * scale;

    return {
      ...metric,
      outerX,
      outerY,
      valueX,
      valueY,
      labelX: cx + Math.cos(angle) * (radius + 24),
      labelY: cy + Math.sin(angle) * (radius + 24),
    };
  });

  const polygon = axisPoints
    .map((point) => `${point.valueX},${point.valueY}`)
    .join(" ");
  const gridScales = [1, 0.75, 0.5, 0.25];

  return (
    <div className="grid gap-4 rounded-2xl bg-[color:var(--muted)]/55 p-4">
      <div className="text-sm font-medium text-[color:var(--foreground)]">
        Performance radar
      </div>
      <svg
        className="h-[320px] w-full"
        viewBox="0 0 340 280"
        aria-hidden="true"
      >
        {gridScales.map((scale) => (
          <polygon
            key={scale}
            points={axisPoints
              .map((point) => {
                const x = cx + (point.outerX - cx) * scale;
                const y = cy + (point.outerY - cy) * scale;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1"
          />
        ))}

        {axisPoints.map((point) => (
          <line
            key={point.label}
            x1={cx}
            y1={cy}
            x2={point.outerX}
            y2={point.outerY}
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={polygon}
          fill="rgba(37,99,235,0.18)"
          stroke="rgb(37,99,235)"
          strokeWidth="2.5"
        />

        {axisPoints.map((point) => (
          <g key={`${video.id}-${point.label}`}>
            <circle
              cx={point.valueX}
              cy={point.valueY}
              r="4.5"
              fill="white"
              stroke="rgb(37,99,235)"
              strokeWidth="2.5"
            />
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-medium"
            >
              {point.label}
            </text>
            <text
              x={point.labelX}
              y={point.labelY + 14}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {point.display}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Dashboard() {
  const {
    videoUrlA,
    videoUrlB,
    chatInput,
    messages,
    sessionId,
    sessionStatus,
    videos,
    error,
    isSubmitting,
    isStreaming,
    isRestoring,
    pipelineState,
    setVideoUrlA,
    setVideoUrlB,
    setChatInput,
    restoreSession,
    stopPolling,
    clearSession,
    handleIngest,
    runStream,
  } = useDashboardStore();

  useEffect(() => {
    void restoreSession();

    return () => {
      stopPolling();
    };
  }, [restoreSession, stopPolling]);

  const readinessLabel = isRestoring
    ? "Restoring session"
    : sessionStatus === "READY"
      ? "Ready for analysis"
      : sessionStatus === "FAILED"
        ? "Attention required"
        : sessionStatus === "PROCESSING" || sessionStatus === "QUEUED"
          ? "Comparison in progress"
          : "Awaiting submission";
  const isCompareLoading =
    isSubmitting ||
    sessionStatus === "QUEUED" ||
    sessionStatus === "PROCESSING";
  const strength = getVideoStrength(videos);
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const backendResponse = summarizeBackendResponse(latestAssistantMessage);

  return (
    <main className="min-h-screen">
      <nav className="border-b border-[color:var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-4 py-4 md:px-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Eval
            </div>
            <div className="mt-1 text-base font-semibold tracking-[-0.02em]">
              Social video comparison workspace
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={getSessionBadge(sessionStatus)}>
              {isRestoring
                ? "Restoring..."
                : sessionStatus
                  ? `Session ${sessionStatus.toLowerCase()}`
                  : "No session"}
            </Badge>
            <Button size="sm" variant="ghost">
              Login
            </Button>
            <Button size="sm">Sign up</Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1480px] px-4 py-7 md:px-6">
        <div className="grid gap-5">
          <Card className="overflow-hidden rounded-[2rem]">
            <CardContent className="grid gap-8 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
              <div className="space-y-5">
                <div className="max-w-3xl">
                  <h1 className="max-w-4xl text-lg font-semibold leading-[0.95] tracking-[-0.05em] text-[color:var(--foreground)] md:text-6xl">
                    Eval - Smart Comparative Analytics{" "}
                    <p className="text-lg mt-2 tracking-normal text-gray-600">
                      Compare performance, transcript evidence, and AI reasoning
                      in one clean flow.
                    </p>
                  </h1>
                  <Badge
                    variant="accent"
                    className="mt-2 rounded-full px-3 py-2 normal-case tracking-normal"
                  >
                    Grounded analysis for supported social video links powered
                    by AI.
                  </Badge>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)]">
                    An AI-powered video intelligence platform that compares two
                    supported video URLs, explains why one performs better, and
                    provides actionable recommendations to improve future
                    content.
                  </p>
                </div>
              </div>

              <Card className="rounded-3xl border-[0px] bg-white shadow-none">
                <CardContent className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      Video 1
                    </span>
                    <div className="relative">
                      <ClipboardPaste className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                      <Input
                        className="pl-10"
                        placeholder="Paste a YouTube or Instagram URL"
                        value={videoUrlA}
                        onChange={(event) => setVideoUrlA(event.target.value)}
                      />
                    </div>
                  </label>

                  <div className="flex justify-center items-center w-full border-b h-0 mt-1 border-gray-400">
                    <p className="bg-white px-1 text-gray-500">or</p>
                  </div>

                  <label className="grid gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      Video 2
                    </span>
                    <div className="relative">
                      <ClipboardPaste className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                      <Input
                        className="pl-10"
                        placeholder="Paste a YouTube or Instagram URL"
                        value={videoUrlB}
                        onChange={(event) => setVideoUrlB(event.target.value)}
                      />
                    </div>
                  </label>
                  {/* {sessionId ? (
                    <div className="text-sm text-[color:var(--muted-foreground)]">
                      Active session:{" "}
                      <span className="font-mono text-[color:var(--foreground)]">
                        {sessionId}
                      </span>
                    </div>
                  ) : null}
                  {error ? (
                    <div className="rounded-xl border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)]">
                      {error}
                    </div>
                  ) : null} */}

                  <div className="flex flex-col flex-wrap gap-3">
                    <Button
                      disabled={isCompareLoading || isRestoring}
                      onClick={() => void handleIngest()}
                    >
                      {isCompareLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Comparing...
                        </>
                      ) : (
                        <>Compare</>
                      )}
                    </Button>
                    <Button onClick={clearSession} variant="outline">
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Comparison progress</CardTitle>
              <CardDescription>
                Watch the pipeline advance from pending to complete as the
                comparison session becomes ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-4">
                {pipelineState.map((step, index) => {
                  const ready = step.state === "ready";
                  const failed = step.state === "failed";
                  return (
                    <div className="relative" key={step.label}>
                      <div className="flex items-start gap-3 h-23">
                        <div
                          className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                            failed
                              ? "border-red-500 bg-red-500 text-white"
                              : ready
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div
                            className={`text-sm font-medium ${
                              failed
                                ? "text-red-600"
                                : "text-[color:var(--foreground)]"
                            }`}
                          >
                            {step.label}
                          </div>
                          <div
                            className={`mt-1 text-sm leading-6 ${
                              failed
                                ? "text-red-500"
                                : "text-[color:var(--muted-foreground)]"
                            }`}
                          >
                            {step.detail}
                          </div>
                        </div>
                      </div>
                      {index < pipelineState.length ? (
                        <div className="mt-4 block h-1.5 rounded-full bg-slate-300/90">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              failed
                                ? "w-full bg-red-500"
                                : ready
                                  ? "w-full bg-emerald-500"
                                  : "w-0 bg-emerald-500"
                            }`}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
            <Card>
              <CardHeader className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Comparison block</CardTitle>
                  <CardDescription>
                    Graphical comparison of core performance objectives for both
                    videos.
                  </CardDescription>
                </div>
                {/* <Badge variant="accent">SRS-aligned comparison view</Badge> */}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  {videos.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-[color:var(--border-strong)] bg-white/70 shadow-none xl:col-span-2">
                      <CardContent className="p-6">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                          No active comparison yet
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                          Once the backend session reaches ready state, both
                          video panels will show engagement metrics, transcript
                          evidence, and summary insights.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}

                  {videos.map((video) => (
                    <Card className="rounded-3xl bg-white" key={video.id}>
                      <CardContent className="flex flex-col gap-6 p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <Badge
                              variant="accent"
                              className="normal-case tracking-normal"
                            >
                              {video.sourceLabel}
                            </Badge>
                            <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">
                              {video.title}
                            </h3>
                            <div className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                              <span>cretor: {video.creator}</span>
                              <span>posted: {video.uploadDate}</span>
                            </div>
                          </div>
                          <div className="grid gap-2 md:justify-items-end">
                            <Badge
                              variant={
                                video.status === "ready" ? "success" : "warning"
                              }
                            >
                              {video.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {[
                            { label: "Views", value: video.views },
                            { label: "Likes", value: video.likes },
                            { label: "Comments", value: video.comments },
                            {
                              label: "Engagement",
                              value: video.engagementRate,
                            },
                            { label: "Duration", value: video.duration },
                          ].map((metric) => (
                            <Badge className="bg-white" key={metric.label}>
                              {metric.label}: {metric.value}
                            </Badge>
                          ))}
                        </div>

                        <MetricRadarChart video={video} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card className="rounded-[2rem] border border-[color:var(--border-strong)] bg-white shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Compact Result</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                  {strength ? (
                    <>
                      <div
                        className={`rounded-[1.35rem] border px-5 py-5 ${
                          strength.leader?.id === "A"
                            ? "border-blue-400 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-100"
                            : strength.leader === null
                              ? "border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-100"
                              : "border-slate-300 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-200"
                        }`}
                      >
                        <div className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                          {videos[0]?.title ?? "Video A"}
                        </div>
                        <div className="mt-2 text-right text-sm font-medium text-[color:var(--muted-foreground)]">
                          Video A
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-4 text-lg font-semibold tracking-[0.18em] text-[color:var(--foreground)]">
                        <span className="h-px w-full max-w-[96px] bg-slate-300" />
                        <span>VS</span>
                        <span className="h-px w-full max-w-[96px] bg-slate-300" />
                      </div>

                      <div
                        className={`rounded-[1.35rem] border px-5 py-5 ${
                          strength.leader?.id === "B"
                            ? "border-blue-400 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-100"
                            : strength.leader === null
                              ? "border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-100"
                              : "border-slate-300 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-200"
                        }`}
                      >
                        <div className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                          {videos[1]?.title ?? "Video B"}
                        </div>
                        <div className="mt-2 text-right text-sm font-medium text-[color:var(--muted-foreground)]">
                          Video B
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-[color:var(--border-strong)] bg-gradient-to-r from-slate-50 via-white to-slate-100 px-5 py-6 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      Compact comparison will appear once both videos are loaded.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="flex min-h-[100%] flex-col">
                <CardHeader className="pb-4">
                  <CardTitle>Analysis chat</CardTitle>
                  <CardDescription>
                    Session-aware streaming answers with markdown and citations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  {/* <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                    <div className="mb-3 text-sm font-medium text-[color:var(--foreground)]">
                      Backend response interpretation
                    </div>
                    {backendResponse ? (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="accent">{backendResponse.routeLabel}</Badge>
                          <Badge variant="default">{backendResponse.modelLabel}</Badge>
                          <Badge variant="success">{backendResponse.evidenceLabel}</Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-[color:var(--muted-foreground)]">
                          <div>
                            <span className="font-medium text-[color:var(--foreground)]">Source mix: </span>
                            {backendResponse.sourceLabel}
                          </div>
                          <div>
                            <span className="font-medium text-[color:var(--foreground)]">Grounding: </span>
                            {backendResponse.confidenceTone}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                        Once the backend returns a streamed answer, this panel will show the answer type,
                        model, citation count, and source distribution.
                      </p>
                    )}
                  </div> */}

                  <div className="grid gap-3">
                    {promptIdeas.map((prompt) => (
                      <Button
                        className="h-auto justify-start rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-left text-sm font-medium text-[color:var(--foreground)] shadow-none hover:bg-[color:var(--secondary)]"
                        disabled={
                          !sessionId || sessionStatus !== "READY" || isStreaming
                        }
                        key={prompt}
                        onClick={() => void runStream(prompt)}
                        variant="secondary"
                      >
                        <Sparkles className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" />
                        <span className="whitespace-normal">{prompt}</span>
                      </Button>
                    ))}
                  </div>

                  <div className="flex min-h-[460px] flex-1 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/35 p-2">
                    <ScrollArea className="h-[460px] w-full pr-2">
                    <div className="grid gap-3">
                      {messages.map((message) => (
                        <div
                          className={
                            message.role === "user"
                              ? "ml-auto max-w-[88%] rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-50"
                              : "max-w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-4 text-sm text-[color:var(--foreground)]"
                          }
                          key={message.id}
                        >
                          <div className="prose-output">
                            <ReactMarkdown>
                              {message.markdown || "..."}
                            </ReactMarkdown>
                          </div>
                          {message.role === "assistant"
                            ? formatCitations(message.citations)
                            : null}
                        </div>
                      ))}
                    </div>
                    </ScrollArea>
                  </div>

                  <div className="mt-auto flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-2">
                    <Input
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      placeholder="Ask a grounded comparison question"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                    />
                    <Button
                      className="shrink-0 rounded-xl"
                      disabled={
                        !chatInput.trim() ||
                        isStreaming ||
                        !sessionId ||
                        sessionStatus !== "READY"
                      }
                      onClick={() => void runStream(chatInput.trim())}
                    >
                      {isStreaming ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Streaming...
                        </>
                      ) : (
                        <>
                          <MessageSquareText className="size-4" />
                          Send question
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
