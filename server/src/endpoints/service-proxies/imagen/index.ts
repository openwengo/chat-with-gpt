import express, { Request, Response } from 'express';
import RequestHandler from "../../base";
import { config } from '../../../config';
import fetch from 'node-fetch';
import { getGCPAccessToken } from '../../../gcptoken';


// Function to handle Server-Sent Events
const sendSSE = (req: Request, res: Response, data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush();
};

const validAspectRatios = ["1:1", "9:16", "16:9", "3:4", "4:3"];

const imagenConfig = config.services?.imagen ;

function getClosestAspectRatio(aspectRatio: string): string {
    const [x, y] = aspectRatio.split(':').map(Number);
    if (isNaN(x) || isNaN(y) || x <= 0 || y <= 0) {
        return "1:1";
    }

    const ratios = validAspectRatios.map(ratio => {
        const [rx, ry] = ratio.split(':').map(Number);
        return { ratio, diff: Math.abs((x / y) - (rx / ry)) };
    });

    ratios.sort((a, b) => a.diff - b.diff);
    return ratios[0].ratio;
}


export interface ImagenRequestParameters {
    sampleCount: number;
    personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
    safetySetting?: "block_most" | "block_some" | "block_few" | "block_fewest";
    addWatermark?: boolean;
    aspectRatio: string;
    negativePrompt?: string;
}

export interface ImagenRequestInstance {
    prompt: string;
}

export interface ImagenApiRequestBody {
    instances: ImagenRequestInstance[];
    parameters: ImagenRequestParameters;
}

export interface ImagenModelResult {
    bytesBase64Encoded?: string;
    imageUrl?: string;
    mimeType?: string;
    raiFilteredReason?: string;
    safetyAttributes?: {
        categories?: string[];
        scores?: number[];
    };
}

export interface ImagenApiResponse {
    predictions: ImagenModelResult[];
}

export default class ImagenProxyRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const { nanoid } = await import('nanoid'); // esm
                
        if (req.body?.stream) {
            res.set({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            });
        
            console.log("imagen body:", req.body);
            let imagenResponse: ImagenApiResponse = { predictions: []} ;

            if (! imagenConfig?.generateEndpoint) {
                sendSSE(req, res, { 'response': imagenResponse , 'error': `not generate Endpoint!` });

                res.write(`data: [DONE]\n\n`);
                res.flush();
                res.end();
                return;                    
            }

            const { prompt, negativePrompt, aspectRatio } = req.body;

            if (!prompt) {
                sendSSE(req, res, { 'response': imagenResponse , 'error': `Prompt is required!` });
                res.write(`data: [DONE]\n\n`);
                res.flush();
                res.end();
                return;                    
            }
    
            const loggedUser = (req as any).session?.passport?.user?.id;
            
            let validatedAspectRatio = "1:1";
            if (aspectRatio) {
                if (validAspectRatios.includes(aspectRatio)) {
                    validatedAspectRatio = aspectRatio;
                } else if (/^\d+:\d+$/.test(aspectRatio)) {
                    validatedAspectRatio = getClosestAspectRatio(aspectRatio);
                }
            }

            const requestBody: ImagenApiRequestBody = {
                instances: [
                    {
                        prompt: prompt
                    }
                ],
                parameters: {
                    sampleCount: imagenConfig?.sampleCount || 2, // Default to 2 images
                    ...(negativePrompt && { negativePrompt: negativePrompt }),                    
                    aspectRatio: validatedAspectRatio,
                    includeRaiReason: true
                }
            };        
            if (imagenConfig?.personGeneration) {
                requestBody.parameters.personGeneration = imagenConfig?.personGeneration;
            }
    
            if (imagenConfig?.safetySetting) {
                requestBody.parameters.safetySetting = imagenConfig?.safetySetting;
            }
    
            if (imagenConfig?.addWatermark !== undefined) {
                requestBody.parameters.addWatermark = imagenConfig?.addWatermark;
            }

            console.log(`Creating ${requestBody.parameters.sampleCount} images in ${validatedAspectRatio} with prompt: ${requestBody.instances[0].prompt} and aspectration ${requestBody.parameters.aspectRatio} and negative prompt: ${requestBody.parameters.negativePrompt} on endpoint ${imagenConfig?.generateEndpoint}`  )
                        
            sendSSE(req, res, { 'responses': imagenResponse } );

            try {
                const token = await getGCPAccessToken(imagenConfig.projectId);

                const apiResponse = await fetch(imagenConfig?.generateEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify(requestBody)
                });
    
                if (!apiResponse.ok) {                    
                    const errorResponse = await apiResponse.json();
                    console.log("imagenApiError:", errorResponse, requestBody);
                    sendSSE(req, res, { 'response': imagenResponse , 'error': `Error calling imagen api: ${errorResponse.message}` });
                    res.write(`data: [DONE]\n\n`);
                    res.flush();
                    res.end();
                    return;                        
                }
    
                const responseData: ImagenApiResponse = await apiResponse.json();
                if (responseData.predictions) {
                    for(const imageResult of responseData.predictions) {

                        if (imageResult.bytesBase64Encoded) {
                            const id = nanoid();
                            const newImageUrl = 'images/' + id + '.png';
                            console.log(`save image to ${newImageUrl}`);
                            const buffer = Buffer.from(imageResult.bytesBase64Encoded, 'base64');
        
                            await this.context.database.createImage(loggedUser, id, prompt, 'imagen');
        
                            // Upload to S3
                            await  this.context.objectStore.putBinary(
                                newImageUrl,
                                buffer,
                                'image/png'
                            );
        
                            imageResult.imageUrl = (config.services?.openai?.imagesBaseUrl ? config.services.openai.imagesBaseUrl : "") + newImageUrl;
                            delete imageResult.bytesBase64Encoded;
                        }
                    }    
                }                    
                sendSSE(req, res, { 'response': responseData });
                console.log(`${responseData.predictions?.length} images generated`);
                res.write(`data: [DONE]\n\n`);
                res.flush();
                res.end();

            } catch (error) {
                console.error('Error generating image:', error);
                sendSSE(req, res, { 'response': imagenResponse , 'error': `${error}` });
                res.write(`data: [DONE]\n\n`);
                res.flush();            
                res.end();
                return ;
            }
        } else {

            res.status(405).send({ error: 'Only streaming response supported'});
            res.end();
        }
        return ;            
    }

    public isProtected() {
        return config.services?.midjourney?.loginRequired ?? true;
    }
}