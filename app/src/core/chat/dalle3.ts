import EventEmitter from "events";
import { Configuration, OpenAIApi } from "openai";
import SSE from "../utils/sse";
import { OpenAIMessage, Parameters, Dalle3Parameters, DalleImageObject, DalleImageList } from "./types";
import { backend } from "../backend";


export function isProxySupported() {
    return !!backend.current?.services?.includes('dalle3');
}

function shouldUseProxy(apiKey: string | undefined | null) {
    return true ;
}

function getEndpoint(proxied = false) {
    return '/chatapi/proxies/dalle3';
}

export interface DalleResponseChunk {
    done: boolean;
    imagelist?: DalleImageList;
}

function parseResponseChunk(buffer: any): DalleResponseChunk {
    const chunk = buffer.toString().replace('data: ', '').trim();

    if (chunk === '[DONE]') {
        return {
            done: true            
        };
    }

    const parsed = JSON.parse(chunk);

    return {
        done: false,
        imagelist: parsed.images
    };
}

export async function createStreamingDalleCompletion(messages: OpenAIMessage[], parameters: Parameters) {
    const emitter = new EventEmitter();

    const proxied = true;
    const endpoint = getEndpoint(proxied);

    const eventSource = new SSE(endpoint + '/v1/dalle3/', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': '',
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify({
            "messages": messages,
            "stream": true,
            "dalle3": true,
            "format": parameters.dalle3Parameters?.format,
            "style": parameters.dalle3Parameters?.style,
            "quality": parameters.dalle3Parameters?.quality,
            "prompt": parameters.dalle3Parameters?.prompt
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
            if (chunk.imagelist) {                
                emitter.emit('data', event.data);
            } else {
                console.log("Received dalle3 SSE without imagelist:", event.data);
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
