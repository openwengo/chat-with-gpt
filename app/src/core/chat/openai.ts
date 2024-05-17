import EventEmitter from "events";
import { Configuration, OpenAIApi } from "openai";
import SSE from "../utils/sse";
import { OpenAIMessage, Parameters, OpenAIFunctionCall, OpenAIToolCall } from "./types";
import { backend } from "../backend";

//export const defaultModel = 'gpt-3.5-turbo';
//export const defaultModel = 'gpt-4';
export const defaultModel = 'gpt-4o';

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
            tool_calls?: OpenAIToolCall[];
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
        console.log("image input detected! Force gpt-4o");
        parameters.model = "gpt-4o"
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

    let tools: any = [] ;

    const formattedMessages: any[] = messages.flatMap((message) => {
        
        
        if ( message.role === 'system' ) {
            const contentObjects =  message.content ;
            return [{
                role: message.role,
                content: contentObjects
              }];            
        } else if ( message.role === 'user' ) {
            const contentObjects: any =  [{type: "text", text: message.content }];
            if (message.images && message.images.length > 0) {
                image_input = true;
                const imageObjects = message.images.map((imageUrl) => ({
                  type: "image_url",
                  image_url: { url: imageUrl },
                }));
                contentObjects.push(...imageObjects);
            }      
    
            if (message.callable_tools) {
                tools = message.callable_tools.map((tool) => ({
                    type: "function",
                    function: tool
                }))
            }
        
            return [{
                role: message.role,
                content: contentObjects
            }];
        } else if ( message.role === 'assistant' ) {
                   
            if ((message.tool_messages !== undefined) && (message.tool_messages.length > 0) && (message.tool_calls !== undefined)) {

                const toolMessages = message.tool_messages.map((tool_call) => ({
                    role: 'tool',
                    content: tool_call.content,
                    tool_call_id: tool_call.tool_call_id
                })) ;

                const tool_calls: any[] = message.tool_calls.map((tool_call) => ({
                    id: tool_call.id,
                    type: tool_call.type,
                    function: tool_call.function
                }))
                const assistantList: any[] = [{
                    role: message.role,
                    tool_calls
                }];
                return [...assistantList, ...toolMessages];
            } else {
                return [{
                    role: message.role,
                    content: message.content
                }]

            }
        }    
        throw(`Unmanaged message role: ${message.role}`);
        return [] ;
      });

      
    let payload_object: any = {
        "model": parameters.model,
        "messages": formattedMessages,
        "temperature": parameters.temperature,
        "stream": true,
        "wengoplusmode": parameters.wengoplusmode
    }

    if (image_input) {
        console.log("image input detected! Force gpt-4-turbo");
        parameters.model = "gpt-4-turbo" ;
        payload_object.model = parameters.model ;
        payload_object = {...payload_object, max_tokens: 3000} ;
    }

    if (tools) {
        if ( parameters.model === "gpt-4-vision-preview" ) {
            console.log(`model ${parameters.model} does not support tools. Ignoring`)
        } else {
            payload_object.tools = tools;
        }
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
    let tool_calls: OpenAIToolCall[] = [];

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
            if (tool_calls) {
                console.log("tool_calls:", tool_calls);

                tool_calls.forEach( tool_call => {
                    console.log("emit call function:", tool_call.function.name);
                    emitter.emit('tool_call', JSON.stringify(tool_call));
                })
                
    
            }            

            emitter.emit('done');
            return;
        }

        try {
            const chunk = parseResponseChunk(event.data);
            if (chunk.choices && chunk.choices.length > 0) {
                contents += chunk.choices[0]?.delta?.content || '';
                emitter.emit('data', contents);

                if (chunk.choices[0]?.delta?.tool_calls ) {
                    //console.log("Tool calls returned by OpenAI", chunk.choices[0]?.delta?.tool_calls);
                    chunk.choices[0]?.delta?.tool_calls.forEach(tool_call => {
                        if (tool_calls.length < tool_call.index + 1) {
                            tool_calls.push(tool_call);
                        } else {
                            tool_calls[tool_call.index].function.arguments += tool_call.function.arguments;
                        }
                    });
                }
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
    "gpt-4-turbo": 100000,
    "gpt-4o": 100000,
    "openai/gpt-4-32k": 32767,
    "anthropic/claude-2": 100000,
    "anthropic/claude-instant-v1": 100000
}
