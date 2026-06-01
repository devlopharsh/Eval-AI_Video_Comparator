export declare class IngestionShellService {
    private readonly resolvedCommandCache;
    commandExists(command: string): Promise<boolean>;
    run(command: string, args: string[], timeout?: number): Promise<{
        stdout: string;
        stderr: string;
    }>;
    private resolveCommand;
    private resolveCommandUncached;
}
