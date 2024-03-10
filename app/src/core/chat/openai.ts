import EventEmitter from "events";
import { Configuration, OpenAIApi } from "openai";
import SSE from "../utils/sse";
import { OpenAIMessage, Parameters } from "./types";
import { backend } from "../backend";

//export const defaultModel = 'gpt-3.5-turbo';
//export const defaultModel = 'gpt-4';
export const defaultModel = 'gpt-4-turbo-preview';

export function isProxySupported() {
    return !!backend.current?.services?.includes('openai');
}

function shouldUseProxy(apiKey: string | undefined | null) {
    return !apiKey && isProxySupported();
}

function getEndpoint(proxied = false) {
    return proxied ? '/chatapi/proxies/openai' : 'https://api.openai.com';
}

function getOpenRouterEndpoint(proxied = true) {
    return proxied ? '/chatapi/proxies/openrouter' : 'https://openrouter.ai/api';
}


export interface OpenAIResponseChunk {
    id?: string;
    done: boolean;
    choices?: {
        delta: {
            content: string;
        };
        index: number;
        finish_reason: string | null;
    }[];
    model?: string;
}

function parseResponseChunk(buffer: any): OpenAIResponseChunk {
    const chunk = buffer.toString().replace('data: ', '').trim();

    if (chunk === '[DONE]') {
        return {
            done: true,
        };
    }

    const parsed = JSON.parse(chunk);

    return {
        id: parsed.id,
        done: false,
        choices: parsed.choices,
        model: parsed.model,
    };
}

export async function createChatCompletion(messages: OpenAIMessage[], parameters: Parameters): Promise<string> {
    const proxied = shouldUseProxy(parameters.apiKey);
    let endpoint = getEndpoint(proxied);

    if (!proxied && !parameters.apiKey) {
        throw new Error('No API key provided');
    }

    
    if ( parameters.model.startsWith('openai/') || parameters.model.startsWith('anthropic/')  ) {
        endpoint = getOpenRouterEndpoint(proxied);
    }
    
   
    console.log("Configured endpoint:", endpoint);
    let messagesWithImages: any[] = [];

    let image_input = false ;

    for( const message of messages ) {
        if ( Array.isArray(message.content ) ) {
            for ( const content of message.content ) {
                if ( content.type === 'image_url ') {
                    image_input = true ;
                    break
                }
            }
        }
        if (image_input) {
            break
        }
    }

    if (image_input) {
        console.log("image input detected! Force gpt-4-vision-preview");
        parameters.model = "gpt-4-vision-preview"
    }
    
    const response = await fetch(endpoint + '/v1/chat/completions', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': !proxied ? `Bearer ${parameters.apiKey}` : '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "model": parameters.model,
            "messages": messages,
            "temperature": parameters.temperature,
        }),
    });

    const data = await response.json();

    return data.choices[0].message?.content?.trim() || '';
}

export async function createStreamingChatCompletion(messages: OpenAIMessage[], parameters: Parameters) {
    const emitter = new EventEmitter();

    const proxied = shouldUseProxy(parameters.apiKey);
    let endpoint = getEndpoint(proxied);

    if (!proxied && !parameters.apiKey) {
        throw new Error('No API key provided');
    }
    

    let image_input = false ;

    const formattedMessages = messages.map((message) => {
        let contentObjects: any = null;
        
        if ( message.role === 'system' ) {
            contentObjects =  message.content ;
        } else {
            contentObjects =  [{type: "text", text: message.content }];
        }
    
        if (message.images && message.images.length > 0) {
          image_input = true;
          const imageObjects = message.images.map((imageUrl) => ({
            type: "image_url",
            image_url: { url: imageUrl },
          }));
          contentObjects.push(...imageObjects);
        }
    
        return {
          role: message.role,
          content: contentObjects,
        };
      });
  
    let payload_object: any = {
        "model": parameters.model,
        "messages": formattedMessages,
        "temperature": parameters.temperature,
        "stream": true,
        "wengoplusmode": parameters.wengoplusmode
    }

    if (image_input) {
        console.log("image input detected! Force gpt-4-vision-preview");
        parameters.model = "gpt-4-vision-preview" ;
        payload_object.model = parameters.model ;
        payload_object = {...payload_object, max_tokens: 1000} ;
    }
  
    if ( parameters.model.startsWith('openai/') || parameters.model.startsWith('anthropic/')  ) {
        endpoint = getOpenRouterEndpoint(proxied);
    }

    console.log("Configured endpoint:", endpoint, "formattedMessages:", formattedMessages);

    const eventSource = new SSE(endpoint + '/v1/chat/completions', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': !proxied ? `Bearer ${parameters.apiKey}` : '',
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(payload_object),
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
            if (chunk.choices && chunk.choices.length > 0) {
                contents += chunk.choices[0]?.delta?.content || '';
                emitter.emit('data', contents);
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

export const maxTokensByModel = {
    "chatgpt-3.5-turbo-16k": 16383,
    "gpt-4": 8191,
    "openai/gpt-4-32k": 32767,
    "anthropic/claude-2": 100000,
    "anthropic/claude-instant-v1": 100000
}
