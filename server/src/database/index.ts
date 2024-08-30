import ExpiryMap from "expiry-map";
import { config } from '../config';
import { memcached, storeValue, getValue} from './memcached' ;
import { encode, decode } from '@msgpack/msgpack';

// @ts-ignore
import type { Doc } from "yjs";

// const documents = new ExpiryMap<string, Doc>(60 * 60 * 1000);
const documents = new ExpiryMap<string, Doc>(1 * 60 * 60 * 1000);

export default abstract class Database {
    public async initialize() {}
    public abstract createUser(email: string, passwordHash: Buffer): Promise<void>;
    public abstract getUser(email: string): Promise<{
        id: string;
        email: string;
        passwordHash: Buffer;
        salt: Buffer | null;
    }>;
    public abstract getChats(userID: string): Promise<any[]>;
    public abstract getMessages(userID: string): Promise<any[]>;
    public abstract insertMessages(userID: string, messages: any[]): Promise<void>;
    public abstract createShare(userID: string|null, id: string): Promise<boolean>;
    public abstract createImage(userID: string|null, id: string, prompt?: string|null, engine?: string|null, engineref?: string | null): Promise<boolean>;
    public abstract getImagePromptByRef(engine?: string|null, engineref?: string | null): Promise<string | null>;
    public abstract setTitle(userID: string, chatID: string, title: string): Promise<void>;
    public abstract deleteChat(userID: string, chatID: string): Promise<any>;
    public abstract getDeletedChatIDs(userID: string): Promise<string[]>;

    public abstract loadYDoc(userID: string):  Promise<{doc: Doc, merged: Uint8Array}>;
    public abstract saveYUpdate(userID: string, update: Uint8Array): Promise<void>;

    public async getYDoc(userID: string): Promise<Doc> {
        const doc = documents.get(userID);
        if (doc) {
            return doc;
        }

        if (memcached) {
            console.log(`try ot get state for ${userID} from memcached`);

            try {
                const base64doc = await getValue(`chatwithgpt-state-${userID}`);

                if (base64doc) {
                    const buffer = Buffer.from(base64doc, 'base64');

                    const uint8Array = new Uint8Array(buffer);
                
                    const Y = await import('yjs'); // Make sure Yjs is imported for creating Y.Doc
                    const doc = new Y.Doc();
                    
                    Y.applyUpdate(doc, uint8Array);
                    documents.set(userID, doc);

                    return doc;                
                }
            } catch (error) {
                console.log("Failed to get state from memcached", error);
            }

        }
        if (true && config.ydocsUrl) {
            const docUrl=`${config.ydocsUrl}?userID=${userID}`;
            const response = await fetch(docUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/octet-stream',
                },
            });
        
            if (!response.ok) {
                console.log(`fetch doc from ${docUrl} failed!`);                
            } else {
            
                console.log(`fetched ydoc from ${docUrl}, decoding it`);
                const arrayBuffer = await response.arrayBuffer();            
                const uint8Array = new Uint8Array(arrayBuffer);
            
                const Y = await import('yjs'); // Make sure Yjs is imported for creating Y.Doc
                const doc = new Y.Doc();
                
                Y.applyUpdate(doc, uint8Array);
                documents.set(userID, doc);

                return doc;
             }
        }            
        const { doc: newDoc, merged } = await this.loadYDoc(userID);
        if ( memcached) {
            console.log(`store state for ${userID} in memcached`) ;
            const  buffer = Buffer.from(merged.buffer)
            try {
                await storeValue(`chatwithgpt-state-${userID}`, buffer.toString('base64'));
            } catch (error) {
                console.log("Failed to save state in memcached:", error);
            }
        }

        documents.set(userID, newDoc);
        return newDoc;
    }
}