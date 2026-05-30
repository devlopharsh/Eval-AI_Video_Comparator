export declare class IngestionShellService {
    commandExists(command: string): Promise<boolean>;
    run(command: string, args: string[], timeout?: number): Promise<{
        stdout: string;
        stderr: string;
    }>;
}
