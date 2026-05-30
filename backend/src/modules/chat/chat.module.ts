import { Module } from "@nestjs/common";
import { QdrantModule } from "../qdrant/qdrant.module";
import { ChatWorkflowService } from "./chat-workflow.service";
import { ChatController } from "./chat.controller";
import { OpenAiGenerationService } from "./openai-generation.service";
import { ChatService } from "./chat.service";

@Module({
  imports: [QdrantModule],
  controllers: [ChatController],
  providers: [ChatService, OpenAiGenerationService, ChatWorkflowService],
})
export class ChatModule {}
