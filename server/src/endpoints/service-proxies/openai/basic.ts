import express from 'express';
import axios from 'axios';
import { apiKey, endPoint } from './index';

export async function basicHandler(req: express.Request, res: express.Response) {
    const response = await axios.post(endPoint, JSON.stringify(req.body), {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    })

    res.json(response.data);

    const promptTokens = response.data.usage.prompt_tokens as number;
    const completionTokens = response.data.usage.completion_tokens as number;
    console.log(`prompt tokens: ${promptTokens}, completion tokens: ${completionTokens}, model: ${req.body.model}`);
}