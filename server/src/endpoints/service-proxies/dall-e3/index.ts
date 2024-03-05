import express, { Request, Response } from 'express';
import RequestHandler from "../../base";
//import { streamingHandler } from './dalle3';
//import { basicHandler } from './basic';
import { config } from '../../../config';
import { ClientOptions, OpenAI } from 'openai';
import fetch from 'node-fetch';

export const endpoint = 'https://api.openai.com/v1/images/generations';

// Function to handle Server-Sent Events
const sendSSE = (req: Request, res: Response, data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush();
};

export const baseUrl = config.services?.openai?.baseUrl || 'https://api.openai.com/v1';
export const apiKey = config.services?.openai?.apiKey || process.env.OPENAI_API_KEY;

export default class DalleProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const { nanoid } = await import('nanoid'); // esm

        if (req.body?.stream) {
            res.set({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            });
        
            const messages = req.body.messages;
        
            console.log("dalle body:", req.body);
        
            const loggedUser = (req as any).session?.passport?.user?.id;
        
            const clientOptions: ClientOptions = {
                apiKey: apiKey,
                baseURL: baseUrl
            }
        
            const openai: OpenAI = new OpenAI(clientOptions);
        
            let imageformat: "1024x1024" | "256x256" | "512x512" | "1792x1024" | "1024x1792"  = '1024x1024' ;
        
            if ( req.body.format === 'portrait') {
                imageformat = '1024x1792'
            } else if (req.body.format === 'landscape'){
                imageformat = '1792x1024'
            } else if (req.body.format === 'square'){
                imageformat = '1024x1024'
            }
        
            let style: "vivid" | "natural" = 'vivid' ;
        
            if ( req.body.style === 'natural') {
                style = 'natural'
            }
        
            let quality: "standard" | "hd" = "standard";
        
            if (req.body.quality === 'hd') {
                quality = "hd"
            }
            console.log(`Creating image in ${imageformat} with style ${style}, quality ${quality} and prompt: ${req.body.prompt}` )
        
            let images: OpenAI.ImagesResponse = {created: 0, data: []} ;
        
            sendSSE(req, res, { 'images': images } );
        
            try {                images = await openai.images.generate(
                    {                 
                       "prompt":  req.body.prompt, 
                       model: "dall-e-3",
                       n: 1,
                       size: imageformat,
                       style: style,
                       quality: quality,
                       response_format: "url",
                       user: loggedUser
                   }
               )
               
               for(const image of images.data) {
                    if (image.url) {
                        const id = nanoid();
                        const new_image_url = 'images/' + id + '.png';
                        console.log(`update ${image.url} to ${new_image_url}`);
                        const response = await fetch(image.url);
                        const buffer = await response.buffer();
                        await this.context.database.createImage(loggedUser, id);
                        await this.context.objectStore.putBinary(
                            new_image_url,
                             buffer,
                            'image/png'
                            )
                        image.url= ( config.services?.openai?.imagesBaseUrl ? config.services.openai.imagesBaseUrl : "" ) + new_image_url;
                    }
                }
                sendSSE(req, res, { 'images': images });
                console.log(`${images.data.length} images generated`);
                if (images.created >0 ) {
                    console.log(`First image: ${images.data[0].revised_prompt }`);
                }
                res.write(`data: [DONE]\n\n`);
                res.flush();
                res.end();
            } catch(error)  {
                // Handle any errors
                console.error(error);
                sendSSE(req, res, { 'images': images , 'error': `${error}` });
                res.write(`data: [DONE]\n\n`);
                res.flush();            
                //res.status(500).json({ error: 'An error occurred' , uri: "", progress:"error"});
                res.end();
                return ;
            };
        
            return ;            
        }
    }

    public isProtected() {
        return config.services?.midjourney?.loginRequired ?? true;
    }
}