import express from 'express';
import RequestHandler from "../../base";
import { streamingHandler } from './dalle3';
//import { basicHandler } from './basic';
import { config } from '../../../config';

export const endpoint = 'https://api.openai.com/v1/images/generations';


export default class DalleProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        if (req.body?.stream) {
            await streamingHandler(req, res);
        }
    }

    public isProtected() {
        return config.services?.midjourney?.loginRequired ?? true;
    }
}