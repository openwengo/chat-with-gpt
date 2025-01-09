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

    // Send redirect message
    sendChunkResponse(res, "Merci de vous connecter à https://librechat.wengo.com");
    
    // Send [DONE] to close the stream
    res.write('data: [DONE]\n\n');
    res.end();
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
