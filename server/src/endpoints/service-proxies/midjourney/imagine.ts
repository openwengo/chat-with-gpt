import { Request, Response } from 'express';
import { LoadingHandler, Midjourney } from 'midjourney'; 
import express from 'express';
import { config } from '../../../config';

// Function to handle Server-Sent Events
const sendSSE = (req: Request, res: Response, data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const messages = req.body.messages;

    console.log("midjourney:", req.body.midjourney);

    let completion = '';
    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

    const prompt: string = lastMessage.content.replace(new RegExp("^" + "/imagine"), "")
    // Using the Midjourney client
    const  midjourneyClient = new Midjourney({
        ServerId: <string> config.services?.midjourney?.serverId,
        ChannelId: <string> config.services?.midjourney?.channelId,
        SalaiToken: <string> config.services?.midjourney?.salaiToken,
        Debug: true,
        Ws: true
        } );
    
    try {
        const msg = await midjourneyClient.Imagine(
             prompt, 
            (uri: string, progress: string) => {
                // Send updates to the client every time the callback is executed
                console.log("midjourney progress:", progress) ;
                sendSSE(req, res, { uri, progress });
            }
        );
        sendSSE(req, res, msg);
        console.log("Imagine response:", msg) ;
        res.write(`data: [DONE]\n\n`);
        res.flush();
        res.end();
    } catch(error)  {
        // Handle any errors
        console.error(error);
        res.status(500).json({ error: 'An error occurred' , uri: "", progress:"error"});
        res.end();
        return ;
    };

    return;
}
