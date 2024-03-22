import express from 'express';
import RequestHandler from "../../base";
import { streamingHandler } from './streaming';
import { callWephoneTool } from './wengo_tool' ;
import { basicHandler } from './basic';
import { config } from '../../../config';

export const baseUrl = config.services?.openai?.baseUrl || 'https://api.openai.com/v1';
export const apiKey = config.services?.openai?.apiKey || process.env.OPENAI_API_KEY;
export const openAiUser = config.services?.openai?.user ;
export const openrouterApiKey = config.services?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
export const openrouterBaseUrl = config.services?.openrouter?.baseUrl || 'https://openrouter.ai/api/v1';

export default class OpenAIProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        if (req.body?.stream) {
            await streamingHandler(req, res);
        } else {
            await basicHandler(req, res);
        }
    }

    public isProtected() {
        return config.services?.openai?.loginRequired ?? true;
    }
}

export class WengoToolRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        await callWephoneTool(req, res);
    }

    public isProtected() {
        return true;
    }
}