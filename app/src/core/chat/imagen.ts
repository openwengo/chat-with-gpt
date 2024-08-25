import EventEmitter from "events";
import SSE from "../utils/sse";
import { OpenAIMessage, Parameters, ImagenApiRequestBody, ImagenModelResult, ImagenApiResponse  } from "./types";
import { backend } from "../backend";


export function isProxySupported() {
    return !!backend.current?.services?.includes('imagen');
}

function shouldUseProxy(apiKey: string | undefined | null) {
    return true ;
}

function getEndpoint(proxied = false) {
    return '/chatapi/proxies/imagen';
}

export interface ImagenResponseChunk {
    done: boolean;
    imagenapiresponse?: ImagenApiResponse;
}

function parseResponseChunk(buffer: any): ImagenResponseChunk {
    const chunk = buffer.toString().replace('data: ', '').trim();

    if (chunk === '[DONE]') {
        return {
            done: true            
        };
    }

    const parsed = JSON.parse(chunk);

    return {
        done: false,
        imagenapiresponse: parsed
    };
}

export async function createStreamingImagenCompletion(messages: OpenAIMessage[], parameters: Parameters) {
    const emitter = new EventEmitter();

    const proxied = true;
    const endpoint = getEndpoint(proxied);

    const imagenPayload: any = {
        "messages": messages,
        "stream": true,
        "imagen": true,
        "prompt": parameters.imagenParameters?.prompt
    }
    if (parameters.imagenParameters?.aspectRatio) {
        imagenPayload.aspectRatio = parameters.imagenParameters?.aspectRatio
    }
    if (parameters.imagenParameters?.negativePrompt) {
        imagenPayload.negativePrompt = parameters.imagenParameters?.negativePrompt
    }

    const eventSource = new SSE(endpoint + '/v1/imagen/', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': '',
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(imagenPayload),
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
            if (chunk.imagenapiresponse) {                
                emitter.emit('data', event.data);
            } else {
                console.log("Received imagen SSE without imagenapiresponse:", event.data);
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
