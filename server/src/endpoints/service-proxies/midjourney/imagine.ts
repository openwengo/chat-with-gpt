import { Request, Response } from 'express';
import { LoadingHandler, Midjourney } from 'midjourney'; 
import express from 'express';
import { config } from '../../../config';

// Function to handle Server-Sent Events
const sendSSE = (req: Request, res: Response, data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush();
};

type CommandParams = { [key: string]: string };

function parseCommand(command: string): CommandParams {
  const result: CommandParams = {};
  const parts = command.split(' ');

  for (let i = 1; i < parts.length; i += 2) { // start from 1, because 0 is the command itself
    const param = parts[i];
    const value = parts[i + 1];

    if (param.startsWith('--')) {
      result[param.slice(2)] = value; // remove '--' from param
    }
  }

  return result;
}

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const messages = req.body.messages;

    console.log("midjourney body:", req.body);
    /*
    midjourney body: {
        messages: [
          {
            role: 'midjourney',
            content: '{"id":"1119705681335947414","uri":"https://cdn.discordapp.com/attachments/1119671710564753689/1119705680698421310/journeygo_1790386075_a_green_cat_4d331a70-2625-45c1-bef4-cc7c2cd6df4b.png","hash":"4d331a70-2625-45c1-bef4-cc7c2cd6df4b","content":"[1790386075] a green cat","progress":"done"}'
          },
          { role: 'user', content: '/variations 1' }
        ],
        stream: true,
        midjourney: true,
        midjourneyMethod: '/variations',
        uri: 'https://cdn.discordapp.com/attachments/1119671710564753689/1119705680698421310/journeygo_1790386075_a_green_cat_4d331a70-2625-45c1-bef4-cc7c2cd6df4b.png',
        hash: '4d331a70-2625-45c1-bef4-cc7c2cd6df4b',
        id: '1119705681335947414',
        index: 1
      }
    */
    let completion = '';
    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

        
    // Using the Midjourney client
    const  midjourneyClient = new Midjourney({
        ServerId: <string> config.services?.midjourney?.serverId,
        ChannelId: <string> config.services?.midjourney?.channelId,
        SalaiToken: <string> config.services?.midjourney?.salaiToken,
        Limit: 99,
        MaxWait: 30,
        Debug: true,
        Ws: true
        } );

    await midjourneyClient.Connect();

    if ( req.body.midjourneyMethod == '/imagine') {
        const prompt: string = lastMessage.content.replace(new RegExp("^" + "/imagine"), "")
        
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
            sendSSE(req, res, { uri: "", progress: `error: ${error}` });
            res.write(`data: [DONE]\n\n`);
            res.flush();            
            //res.status(500).json({ error: 'An error occurred' , uri: "", progress:"error"});
            res.end();
            return ;
        };
    }

    if ( req.body.midjourneyMethod == '/midjourneycustom') {       
        
        const command = lastMessage.content ;

        const params = parseCommand(command);

        console.log("Midjourney custom params:", params);


        try {
            const msg = await midjourneyClient.Custom({
                msgId: params['id'],
                customId: params['custom'],
                //content: req.body.messages[0].content, 
                flags: Number(params['flags']),                                
                loading: (uri: string, progress: string) => {
                    // Send updates to the client every time the callback is executed
                    console.log("midjourney progress:", progress) ;
                    sendSSE(req, res, { uri, progress });
                }},
            );
            sendSSE(req, res, msg);
            console.log("Custom response:", msg) ;
            res.write(`data: [DONE]\n\n`);
            res.flush();
            res.end();
        } catch(error)  {
            // Handle any errors
            console.error(error);
            sendSSE(req, res, { uri: "", progress: `error: ${error}` });
            res.write(`data: [DONE]\n\n`);
            res.flush();
            //res.status(500).json({ error: 'An error occurred' , uri: "", progress:"error"});
            res.end();
            return ;
        };
    }

    if ( req.body.midjourneyMethod == '/variations') {
        
        /*
        { index, msgId, hash, content, flags, loading, }: {
            index: 1 | 2 | 3 | 4;
            msgId: string;
            hash: string;
            content?: string;
            flags: number;
            loading?: LoadingHandler;
        }*/

        try {
            const msg = await midjourneyClient.Variation({
                index: req.body.index ,
                msgId: req.body.id,
                hash: req.body.hash,                
                content: req.body.messages[0].content, 
                flags: req.body.flags,                                
                loading: (uri: string, progress: string) => {
                    // Send updates to the client every time the callback is executed
                    console.log("midjourney progress:", progress) ;
                    sendSSE(req, res, { uri, progress });
                }},
            );
            sendSSE(req, res, msg);
            console.log("Variations response:", msg) ;
            res.write(`data: [DONE]\n\n`);
            res.flush();
            res.end();
        } catch(error)  {
            // Handle any errors
            console.error(error);
            res.write(`{ error: 'An error occurred' , uri: "", progress:"error:${error}"}`);
            res.flush();
            res.status(500).json({ error: 'An error occurred' , uri: "", progress:"error"});
            res.end();
            return ;
        };
    }

    if ( req.body.midjourneyMethod == '/upscale') {
        
        try {
            const msg = await midjourneyClient.Upscale({
                index: req.body.index ,
                msgId: req.body.id,
                hash: req.body.hash,                
                content: req.body.messages[0].content, 
                flags: req.body.flags,                                
                loading: (uri: string, progress: string) => {
                    // Send updates to the client every time the callback is executed
                    console.log("midjourney progress:", progress) ;
                    sendSSE(req, res, { uri, progress });
                }},
            );
            sendSSE(req, res, msg);
            console.log("Upscale response:", msg) ;
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
    }

    if ( req.body.midjourneyMethod == '/zoomout') {            
        try {
            const msg = await midjourneyClient.ZoomOut({
                level: req.body.level ,
                msgId: req.body.id,
                hash: req.body.hash,                
                //content: req.body.messages[0].content, 
                flags: req.body.flags,                                
                loading: (uri: string, progress: string) => {
                    // Send updates to the client every time the callback is executed
                    console.log("midjourney progress:", progress) ;
                    sendSSE(req, res, { uri, progress });
                }},
            );
            sendSSE(req, res, msg);
            console.log("Zoomout response:", msg) ;
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
    }


    return;
}
