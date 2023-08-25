
export default abstract class TextsDatabase {
    public async initialize() {}
    public abstract insertText(textHash: string, promptHash: string, text: string): Promise<void>;
    public abstract getText(textHash: string, promptHash: string): Promise<{
        textHash: string;
        promptHash: string;
        text: string;
    }>;
    public abstract insertPrompt(promptHash: string, text: string): Promise<void>;
    public abstract getPrompt(promptHash: string): Promise<{
        promptHash: string;
        text: string;
    }>;    
}