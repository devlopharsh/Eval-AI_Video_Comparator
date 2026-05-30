import { PrismaService } from "../prisma/prisma.service";
import { ChatWorkflowService } from "./chat-workflow.service";
export declare class ChatService {
    private readonly prisma;
    private readonly chatWorkflowService;
    constructor(prisma: PrismaService, chatWorkflowService: ChatWorkflowService);
    streamResponse(sessionId: string, message: string): AsyncGenerator<{
        event: string;
        data: {
            token: string;
        };
    } | {
        event: string;
        data: import("./chat.types").WorkflowAnswer;
    }, void, unknown>;
}
