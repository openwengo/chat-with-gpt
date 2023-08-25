import express from 'express';
import RequestHandler from "../../base";
import { streamingHandler } from './streaming';
import { config } from '../../../config';

export const endpoint = 'https://api.openai.com/v1/chat/completions';
export const apiKey = config.services?.openai?.apiKey || process.env.OPENAI_API_KEY;

export default class TarotProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        if (req.body?.stream) {
            await streamingHandler(req, res);
        } 
    }

    public isProtected() {
        return config.services?.tarot?.loginRequired ?? true;
    }
}