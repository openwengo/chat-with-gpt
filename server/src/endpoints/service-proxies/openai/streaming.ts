// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express,  { Request } from "express";
import { countTokensForMessages } from "./tokenizer";
import { v4 as uuidv4 } from  'uuid' ;
import { Agent } from "http";
import { HttpHandlerOptions } from "@aws-sdk/types";
import { Lambda, InvokeCommand, LambdaClient, LambdaClientConfig, InvokeCommandInput } from "@aws-sdk/client-lambda";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { modelReplacements } from "./modelReplacements";

import { config } from '../../../config';

const baseUrl = config.services?.openai?.baseUrl || 'https://api.openai.com/v1';
const apiKey = config.services?.openai?.apiKey || process.env.OPENAI_API_KEY;
const openAiUser = config.services?.openai?.user ;
const appendUserId = config.services?.openai?.appendUserId ;

const openrouterApiKey = config.services?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
const openrouterBaseUrl = config.services?.openrouter?.baseUrl || 'https://openrouter.ai/api/v1';




function sendChunkResponse(res: express.Response, message: string) {
    const data = `data: {"id":"send${uuidv4()}","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(message)},"index":0,"finish_reason":null}}]}\n\n`;
    //console.log("data:", data);
    res.write(data);
    res.flush();
}

/**
 * Replaces the model in the request body if it is obsolete.
 * @param req The Express request object.
 */
export const replaceObsoleteModel = (req: Request): void => {
    const incomingModel: string | undefined = req.body.model;
  
    if (incomingModel && modelReplacements.has(incomingModel)) {
      const newModel = modelReplacements.get(incomingModel);
      console.warn(
        `Model "${incomingModel}" is obsolete. Replacing with "${newModel}".`
      );
      req.body.model = newModel!;
    }
  };

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    replaceObsoleteModel(req);

    const messages = req.body.messages;
    const promptTokens = countTokensForMessages(messages);

    const loggedUser = (req as any).session?.passport?.user?.id;   

    console.log("temperature:", req.body.temperature);
    console.log("model:", req.body.model);    
    console.log("user:", loggedUser );    
    console.log(`baseUrl: ${baseUrl}`);    


    const tools =[
        { 
            'type': 'function',
            'function': {
                'description': 'This tool manages all interactions with Graam ( aka Wephone ). You can ask it for any information about Graam\'s database',
                'name': 'graam-tool',
                'parameters': {
                    "type": "object",
                    "properties" : {
                        "question" : {
                            'description': "The question to ask about Graam ( aka Wephone ) 's database",
                            'type': 'string'
                        }
                    },
                    "required": ["question"]
                }
            }
        }
    ]
    //req.body.tools = tools ;
    console.log("req.body.tools=", req.body.tools);
    
    if (! req.body.user && openAiUser ) {
        if (appendUserId) {
            req.body['user'] = `${openAiUser}-${loggedUser}`;
        } else {
            req.body['user'] = `${openAiUser}` ;
        }
    }

    let completion = '';
    console.log("messages:", messages);

    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

    const endpoint = req.path.startsWith('/chatapi/proxies/openrouter/') ? `${openrouterBaseUrl}/chat/completions` : `${baseUrl}/chat/completions` ;
    const endpointApiKey = req.path.startsWith('/chatapi/proxies/openrouter/') ? openrouterApiKey : apiKey ;
    
    if ( req.body.tools && req.body.tools.length  === 0 ) {
        delete req.body.tools ;
    }

    console.log("Sending message to:", endpoint);

    console.log(req.body);
    const eventSource = new EventSource( endpoint, {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${endpointApiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'localhost',
            'HTTP-Referer': 'http://localhost'
        },
        body: JSON.stringify({
            ...req.body,
            stream: true,
        }),
        readTimeoutMillis: 180000
    });

    eventSource.addEventListener('message', async (event: any) => {

        if (! event.data) {
            console.log("Event without data:", event) ;
            return ;
        }
        //console.log("new message:", `data: ${event.data}\n\n`);
        res.write(`data: ${event.data}\n\n`);
        res.flush();

        if (event.data === '[DONE]') {
            res.end();
            eventSource.close();

            const totalTokens = countTokensForMessages([
                ...messages,
                {
                    role: "assistant",
                    content: completion,
                },
            ]);
            const completionTokens = totalTokens - promptTokens;
            console.log(`prompt tokens: ${promptTokens}, completion tokens: ${completionTokens}, model: ${req.body.model}`);
            return;
        }

        try {
            const chunk = parseResponseChunk(event.data);
            if (chunk.choices && chunk.choices.length > 0) {
                completion += chunk.choices[0]?.delta?.content || '';
            }
        } catch (e) {
            console.error(e);
        }
    });

    eventSource.addEventListener('error', (event: any) => {
        console.log("Error!", event);
        sendChunkResponse(res, `An error occured. Please try again`);
        res.end();
        eventSource.close();
    });

    eventSource.addEventListener('abort', (event: any) => {
        console.log("Abort!");
        res.end();
    });

    req.on('close', () => {
        eventSource.close();
    });

    res.on('error', e => {
        eventSource.close();
    });
}

function parseResponseChunk(buffer: any) {
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