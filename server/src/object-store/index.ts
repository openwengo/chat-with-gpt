export default abstract class ObjectStore {
    public async initialize() {}
    public abstract get(key: string): Promise<string | null>;
    public abstract put(key: string, value: string, contentType: string): Promise<void>;
    public abstract putBinary(key: string, value: Buffer, contentType: string): Promise<void>;
    public abstract getSignedPutUrl(key: string, contentType: string): Promise<string | null>;

    // New method to retrieve binary data
    public abstract getBinary(key: string): Promise<Buffer>;
}
