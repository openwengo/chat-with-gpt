import EventEmitter from "events";
import { Configuration, OpenAIApi } from "openai";
import SSE from "../utils/sse";
import { OpenAIMessage, Parameters, MidjourneyParameters } from "./types";
import { backend } from "../backend";

//export const defaultModel = 'gpt-3.5-turbo';
export const defaultModel = 'gpt-4';

export function isProxySupported() {
    return !!backend.current?.services?.includes('midjourney');
}

function shouldUseProxy(apiKey: string | undefined | null) {
    return true ;
}

function getEndpoint(proxied = false) {
    return proxied ? '/chatapi/proxies/midjourney' : 'https://api.openai.com';
}

export interface MidJourneyResponseChunk {
    id?: string;
    hash?: string;
    done: boolean;
    progress: string;
    uri: string;
}

function parseResponseChunk(buffer: any): MidJourneyResponseChunk {
    const chunk = buffer.toString().replace('data: ', '').trim();

    if (chunk === '[DONE]') {
        return {
            progress: "done",
            uri: "",
            done: true,
        };
    }

    const parsed = JSON.parse(chunk);

    return {
        id: parsed.id,
        hash: parsed.hash,
        done: false,
        progress: parsed.progress,
        uri: parsed.uri,
    };
}

export async function createStreamingMidjourneyCompletion(messages: OpenAIMessage[], parameters: Parameters) {
    const emitter = new EventEmitter();

    const proxied = true;
    const endpoint = getEndpoint(proxied);

    const eventSource = new SSE(endpoint + '/v1/midjourney/', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': '',
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify({
            "messages": messages,
            "stream": true,
            "midjourney": true,
            "midjourneyMethod": parameters.midjourneyParameters?.midjourneyMethod,
            "uri": parameters.midjourneyParameters?.uri,
            "hash": parameters.midjourneyParameters?.hash,
            "id": parameters.midjourneyParameters?.id,
            "index": parameters.midjourneyParameters?.index,
            "flags": parameters.midjourneyParameters?.flags,
            "level": parameters.midjourneyParameters?.level,
        }),
    }) as SSE;

    let contents = '';

    eventSource.addEventListener('error', (event: any) => {
        if (!contents) {
            let error = event.data;
            try {
                error = JSON.parse(error).error.message;
            } catch (e) {}
            emitter.emit('error', error);
        }
    });

    eventSource.addEventListener('message', async (event: any) => {
        if (event.data === '[DONE]') {
            emitter.emit('done');
            return;
        }

        try {
            const chunk = parseResponseChunk(event.data);
            if (chunk.uri && chunk.progress && ( chunk.uri !== "" ) || chunk.progress.indexOf("error") >= 0) {                
                emitter.emit('data', event.data);
            } else {
                console.log("Received midjourney SSE without uri:", event.data);
            }
        } catch (e) {
            console.error(e);
        }
    });

    eventSource.stream();

    return {
        emitter,
        cancel: () => eventSource.close(),
    };
}
