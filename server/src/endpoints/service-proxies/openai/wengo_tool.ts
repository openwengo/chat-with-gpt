// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express from 'express';
import { v4 as uuidv4 } from  'uuid' ;
import { config } from '../../../config';


function sendChunkResponse(res: express.Response, message: string) {
    const data = `data: {"id":"send${uuidv4()}","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(message)},"index":0,"finish_reason":null}}]}\n\n`;
    //console.log("data:", data);
    res.write(data);
    res.flush();
}

import fetch from 'node-fetch';

export async function callWephoneTool(req: express.Request, res: express.Response) {
    const url = 'https://wephone-tool.k8spreprod.aws.mybestpro/stream';

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    console.log("Calling function with url:", url, req.body);
    

    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

    if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  response.body.on('readable', () => {
    let chunk;
    while ((chunk = response.body.read()) !== null) {
      buffer += chunk ;// decoder.decode(chunk);

      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        if (line) {
          const { event, data } = JSON.parse(line);
          console.log("received event", {event,data})
          res.write(JSON.stringify({ event, data }));
          res.flush();
        }
      }

      buffer = lines[lines.length - 1];
    }
  });

  response.body.on('end', () => {
    res.end();
  })

}
