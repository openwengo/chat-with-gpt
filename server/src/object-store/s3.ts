import { 
    S3,
    PutObjectCommand,
    GetObjectCommand,
    PutObjectCommandInput,
} from "@aws-sdk/client-s3";
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
import type {Readable} from 'stream';
import ObjectStore from "./index";

const bucket = process.env.S3_BUCKET;

const s3 = new S3({
    region: process.env.DEFAULT_S3_REGION,
});

export default class S3ObjectStore extends ObjectStore {
    public async get(key: string): Promise<string | null> {
        const params = {
            Bucket: bucket,
            Key: key,
        };
        const data = await s3.send(new GetObjectCommand(params));
        const result = await readStream(data.Body as Readable);
        return result || null; // Ensure null is returned if no data is found
    }

    public async getBinary(key: string): Promise<Buffer> {
        const params = {
            Bucket: bucket,
            Key: key,
        };
        const data = await s3.send(new GetObjectCommand(params));
        return await readStreamAsBuffer(data.Body as Readable);
    }

    public async put(key: string, value: string, contentType: string) {
        const params : PutObjectCommandInput = {
            Bucket: bucket,
            Key: key,
            Body: value,
            ContentType: contentType,
            StorageClass: "INTELLIGENT_TIERING",
        };
        await s3.send(new PutObjectCommand(params));
    }
    
    public async putBinary(key: string, value: Buffer, contentType: string) {
        const params : PutObjectCommandInput = {
            Bucket: bucket,
            Key: key,
            Body: value,
            ContentType: contentType,
            StorageClass: "INTELLIGENT_TIERING",
        };
        await s3.send(new PutObjectCommand(params));
    }

    public async getSignedPutUrl(key: string, contentType: string) {
        const params = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType
        });

        const presignedUrl = await getSignedUrl(s3 , params, { expiresIn: 60 });
        console.log("presigned url=", presignedUrl);
        return presignedUrl ;
    }
}

async function readStream(stream: Readable) {
    const chunks: any[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function readStreamAsBuffer(stream: Readable) {
    const chunks: any[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks); // Return the buffer directly
}
