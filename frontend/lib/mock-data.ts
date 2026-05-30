export type Citation = {
  source: "Video A" | "Video B";
  chunkId: string;
  timestamp: string;
};

export type VideoInsight = {
  id: "A" | "B";
  sourceLabel: "Video A" | "Video B";
  platform: "YouTube" | "Instagram Reel";
  title: string;
  creator: string;
  status: "ready" | "processing" | "failed" | "queued";
  views: string;
  viewsValue: number;
  likes: string;
  likesValue: number;
  comments: string;
  commentsValue: number;
  engagementRate: string;
  engagementValue: number;
  duration: string;
  uploadDate: string;
  hookSummary: string;
  narrativeSummary: string;
  transcriptExcerpt: string;
  citations: Citation[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  markdown: string;
  citations?: Citation[];
  route?: "metadata" | "retrieval";
  model?: string;
  sourceVideos?: Array<"Video A" | "Video B">;
};

export const promptIdeas = [
  "Why did Video A outperform Video B in the first 15 seconds?",
  "Compare the storytelling pace across both videos.",
  "Suggest a better hook for Video B using evidence from both transcripts.",
];

export const initialMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    markdown:
      "Submit a comparison pair first. Once the backend session is ready, questions stream from the live chat endpoint with backend-generated citations.",
  },
];
