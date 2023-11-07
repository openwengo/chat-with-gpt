import express from 'express';
import RequestHandler from "../../base";
import { streamingHandler } from './streaming';
import { basicHandler } from './basic';
import { config } from '../../../config';

export const endPoint = config.services?.openai?.endPoint || 'https://api.openai.com/v1/chat/completions';
export const apiKey = config.services?.openai?.apiKey || process.env.OPENAI_API_KEY;
export const openrouterApiKey = config.services?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
export const openrouterEndpoint = config.services?.openrouter?.endPoint || 'https://openrouter.ai/api/v1/chat/completions';

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