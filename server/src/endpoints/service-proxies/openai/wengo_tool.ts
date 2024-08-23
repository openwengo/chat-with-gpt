// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express from 'express';
import { v4 as uuidv4 } from  'uuid' ;
import { config } from '../../../config.js';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";


function sendChunkResponse(res: express.Response, message: string) {
    const data = `data: {"id":"send${uuidv4()}","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(message)},"index":0,"finish_reason":null}}]}\n\n`;
    //console.log("data:", data);
    res.write(data);
    res.flush();
}

import fetch from 'node-fetch';

export async function callWephoneTool(
  req: express.Request,
  res: express.Response,
  url: string,
  headers: { [key: string]: string } = {},
  method: "GET" | "POST" = "POST"
  ) {    

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const graam_payload =  { ...JSON.parse(req.body.arguments)} //, agent_type: "audioinsight"}  
    
    let finalUrl = url;
    let fetchOptions: RequestInit = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        }
    };
    if (method === "GET") {
      const queryString = new URLSearchParams(graam_payload as Record<string, string>).toString();
      finalUrl = `${url}?${queryString}`;
    } else {
      fetchOptions.body = JSON.stringify(graam_payload);
    }
    console.log("Calling function with url:", finalUrl, fetchOptions.body, fetchOptions.headers,  fetchOptions.method);
    const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: method != "GET" ? JSON.stringify(graam_payload) : undefined,
      });

    if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status} ${response.body}`);
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


export async function callAstroTool(req: express.Request, res: express.Response) {

  res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
  });

  const astro_payload =  { ...JSON.parse(req.body.arguments), format: 'full_text'}
  console.log("Calling lambda with payload:", astro_payload);
  
  const lambdaClient = new LambdaClient({
    region: "eu-west-3",
  });
  const command = new InvokeCommand({
    FunctionName: "lambda_astrodata",
    Payload: new TextEncoder().encode(JSON.stringify(astro_payload)),
  });
  
  try {
    const response = await lambdaClient.send(command);
  
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    const response_event = {
      event: "on_chain_end",
      data: payload
    }
    res.send(JSON.stringify(response_event));
    res.end();

  } catch (e) {
    throw Error(`Error occured calling lambda: ${e}`) ;
  }


}
 