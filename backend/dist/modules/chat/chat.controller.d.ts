import type { Response } from "express";
import { ChatDto } from "../../shared/dto/chat.dto";
import { ChatService } from "./chat.service";
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    streamChat(body: ChatDto, response: Response): Promise<void>;
}
