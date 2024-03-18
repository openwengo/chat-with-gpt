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

        
// Using the Midjourney client
// let  midjourneyClient: Midjourney | null = null;

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    res.flush();

    const messages = req.body.messages;

    //if (!midjourneyClient) {
    const midjourneyClient = new Midjourney({
        ServerId: <string> config.services?.midjourney?.serverId,
        ChannelId: <string> config.services?.midjourney?.channelId,
        SalaiToken: <string> config.services?.midjourney?.salaiToken,
        Limit: 99,
        MaxWait: 30,
        Debug: true,
        Ws: true,
        UpdateProgressWithoutImage: true,
        EmptyImageUri: "about:blank",
        } );
    //}
        
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
        };
    }

    if ( req.body.midjourneyMethod == '/describe') {       
        
        const command = lastMessage.content ;

        const parts = command.split(' ');

        const params = parts.slice(1).join(' ');

        console.log("Midjourney describe params:", params);


        try {
            sendSSE(req, res, { uri:"about:blank", progress: "0%"});
            const msg = await midjourneyClient.Describe(params);
            
            sendSSE(req, res, { ...msg,  ...{ progress: "done"}});
            console.log("Describe response:", msg) ;
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
        };
    }
    
    midjourneyClient.Close();
    return;
}
