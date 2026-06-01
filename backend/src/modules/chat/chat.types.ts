export type Citation = {
  source: "Video A" | "Video B";
  chunkId: string;
  timestamp: string;
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type WorkflowVideo = {
  side: "A" | "B";
  platform: string;
  title: string;
  engagementRate: number;
  creator: string;
  followerCount: number;
  views: number;
  likes: number;
  comments: number;
  uploadDate: Date;
  durationSeconds: number;
  hashtags: string[];
  transcriptSummary: string;
  chunks: Array<{ chunkKey: string; timestampStart: number; timestampEnd: number }>;
};

export type WorkflowAnswer = {
  route: "metadata" | "retrieval";
  model: string;
  message: string;
  citations: Citation[];
};
