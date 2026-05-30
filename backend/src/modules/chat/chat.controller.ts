import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { ChatDto } from "../../shared/dto/chat.dto";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async streamChat(@Body() body: ChatDto, @Res() response: Response) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    const stream = this.chatService.streamResponse(body.session_id, body.message);

    for await (const item of stream) {
      response.write(`event: ${item.event}\n`);
      response.write(`data: ${JSON.stringify(item.data)}\n\n`);
    }

    response.end();
  }
}
