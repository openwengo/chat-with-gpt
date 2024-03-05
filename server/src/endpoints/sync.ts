import express from 'express';
import { encode } from '@msgpack/msgpack';
import ExpirySet from 'expiry-set';
import { memcached, storeValue, getValue} from '../database/memcached' ;
import RequestHandler from "./base";

let totalUpdatesProcessed = 0;
const recentUpdates = new ExpirySet<number>(1000 * 60 * 5);

export function getNumUpdatesProcessedIn5Minutes() {
    return recentUpdates.size;
}

export default class SyncRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const encoding = await import('lib0/encoding');
        const decoding = await import('lib0/decoding');
        const syncProtocol = await import('y-protocols/sync');

        const doc = await this.context.database.getYDoc(this.userID!);
        
        const Y = await import('yjs');

        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(req.body);

        const messageType = decoding.readVarUint(decoder);

        if (messageType === syncProtocol.messageYjsSyncStep2 || messageType === syncProtocol.messageYjsUpdate) {
            await this.context.database.saveYUpdate(this.userID!, 
                decoding.readVarUint8Array(decoder));
        }   

        decoder.pos = 0;

        syncProtocol.readSyncMessage(decoder, encoder, doc, 'server');

        const responseBuffers = [
            encoding.toUint8Array(encoder),
        ];

        if (messageType === syncProtocol.messageYjsSyncStep1) {
            const encoder = encoding.createEncoder();
            syncProtocol.writeSyncStep1(encoder, doc);
            responseBuffers.push(encoding.toUint8Array(encoder));
        } else if (messageType === syncProtocol.messageYjsUpdate) {
            totalUpdatesProcessed += 1;
            recentUpdates.add(totalUpdatesProcessed);
        }

        const buffer = Buffer.from(encode(responseBuffers));

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);
    }

    public isProtected() {
        return true;
    }
}

export class YdocRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {

        const encoding = await import('lib0/encoding');
        const syncProtocol = await import('y-protocols/sync');

        // Use userID from the query string parameter
        const userID = req.query.userID as string;
        if (!userID) {
            res.status(400).send('UserID is required');
            return;
        }

        try {
            const { doc, merged } = await this.context.database.loadYDoc(userID);
            //console.log("doc=", doc);

            const Y = await import('yjs');            
            const  buffer = Buffer.from(merged.buffer)

            if ( memcached) {
                console.log(`store state for ${userID} in memcached`) ;
                try {
                    await storeValue(`chatwithgpt-state-${userID}`, buffer.toString('base64'));
                } catch (error) {
                    console.log("Failed to save state in memcached:", error);
                }
            }

            // Set appropriate headers for binary data
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', merged.byteLength);

            res.send(buffer);
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

    public isProtected() {
        return false;
    }
}