import express from 'express';
import RequestHandler from "../../base";
import { streamingHandler } from './imagine';
//import { basicHandler } from './basic';
import { config } from '../../../config';

export const endpoint = 'https://api.openai.com/v1/chat/completions';
export const salaiToken = config.services?.midjourney?.salaiToken || process.env.SALAI_TOKEN;

export default class MidjourneyProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        if (req.body?.stream) {
            await streamingHandler(req, res);
        }
    }

    public isProtected() {
        return config.services?.midjourney?.loginRequired ?? true;
    }
}