// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express from 'express';
import { apiKey } from ".";
import { countTokensForMessages } from "../openai/tokenizer";
import { v4 as uuidv4 } from  'uuid' ;
import { Agent } from "http";
import { HttpHandlerOptions } from "@aws-sdk/types";
import { Lambda, InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import axios from 'axios';
import TextsDatabase from '../../../tarotdatabase/index';
import KnexTextsDatabaseAdapter from '../../../tarotdatabase/knex';
const { ChatOpenAI } = require("langchain/chat_models/openai");
const {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
  } = require("langchain/prompts");

async function callStatamax(data: {
  lang: string;
  slug: string;
  userNatalSign: number;
  userRisingSign: number;
}) {
  // Constructing the URL with the required parameters
  const url = new URL('https://ws.statamax.wengo.priv/reporting/generateValues');
  url.searchParams.append('userGender', '0');
  url.searchParams.append('userBirthDate', '24/04/2012');
  url.searchParams.append('userBirthTime', '06:00');
  url.searchParams.append('userBirthLatitude', '12.5');
  url.searchParams.append('userBirthLongitude', '12.1');
  url.searchParams.append('userFirstname', 'Sloan');
  url.searchParams.append('slug', data.slug); 
  url.searchParams.append('purchaseCulture', data.lang);
  url.searchParams.append('userNatalSign', data.userNatalSign.toString());
  url.searchParams.append('userRisingSign', data.userRisingSign.toString());

  // Making the HTTP request with the required header
  try {
    const response = await axios.get(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data; // The JSON response
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
}

import crypto from 'crypto';
import { OpenAIMessage } from "./message";

// Hash Function
function computeHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}



function sendChunkResponse(res: express.Response, message: string) {
    const data = `data: {"id":"send${uuidv4()}","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(message)},"index":0,"finish_reason":null}}]}\n\n`;
    //console.log("data:", data);
    res.write(data);
    res.flush();
}

function cloneWithoutAttributes(source: Record<string, any>, excludepattern: string): Record<string, any> {
    return Object.entries(source).reduce((accumulator, [key, value]) => {
        if (!key.startsWith(excludepattern)) {
            accumulator[key] = value;
        }
        return accumulator;
    }, {} as Record<string, any>);
}


async function generateNewText(prompt: string, text: string, model: any): Promise<string> {

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate("{prompt}"),
        HumanMessagePromptTemplate.fromTemplate("{text}"),
      ]);

    const promptExpanded = await chatPrompt.formatPromptValue({
        prompt: prompt,
        text: text
    });

    //console.log("generateNewText:", promptExpanded.toChatMessages()) ;
    const response: OpenAIMessage = await model.call(promptExpanded.toChatMessages());

    //console.log("generateNewText:", response) ;

    return response.content;
}

// Main Function
async function processWengoodResponse(res: express.Response, responseData: any, prompt: string, tarotdatabase: TextsDatabase, model: any) {
  // Compute prompt hash
  const promptHash = computeHash(`${prompt}-${model.modelName}`);

  // Check if prompt exists, if not insert
  const existingPrompt = await tarotdatabase.getPrompt(promptHash);
  console.log(`Existing prompt ${promptHash}:`, existingPrompt);
  console.log('model:', model);
  if (!existingPrompt) {
    await tarotdatabase.insertPrompt(promptHash, prompt);
  }

  let newResponse = {...responseData} ;
  newResponse.values=cloneWithoutAttributes( responseData.values, "GH20") ;

  // Iterate through the keys starting with "GH20"
  for (const key of Object.keys(responseData.values)) {
    if (key.startsWith('GH20')) {
      const textContent = responseData.values[key];

      if ( textContent.length < 30 ) {
        continue
      }
      
      // Compute hash of the content
      const textHash = computeHash(textContent);

      // Check if the text with prompt exists in the database
      const existingText = await tarotdatabase.getText(textHash, promptHash);
      console.log(`Existing text for ${key} (${textHash}):`, existingText);
      if (existingText) {
        // Replace the value in the result object with it
        responseData.values[key] = existingText.text;
        newResponse.values[key] = existingText.text;
      } else {
        // Generate a new text, compute hash, insert in the database, and replace the value
        const newText = await generateNewText(prompt, textContent, model);
        await tarotdatabase.insertText(textHash, promptHash, newText);
        responseData.values[key] = newText;
        newResponse.values[key] = newText;
      }
      sendChunkResponse(res, JSON.stringify(newResponse));
    }
  }

  return responseData; // Modified response data
}

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const messages = req.body.messages;
    const promptTokens = countTokensForMessages(messages);

    console.log("temperature:", req.body.temperature);
    console.log("model:", req.body.model);    

    let completion = '';
    console.log("messages:", messages);

    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

    if ( req.body.slug ) {
        const model = new ChatOpenAI({openAIApiKey: `${apiKey}`,
        streaming: true,
        temperature: req.body.temperature ? req.body.temperature : 0,
        modelName: req.body.model ? req.body.model : "gpt-3.5-turbo-16k",
        // callbacks: [{
        //     handleLLMNewToken(token: string) {
        //     sendChunkResponse(res, token);
        //     },
        // },]
        });

        let responseApi = await callStatamax( {
            lang: req.body.lang,
            slug: req.body.slug,
            userNatalSign: req.body.userNatalSign,
            userRisingSign: req.body.userRisingSign,
        })

        const tarotdatabase: TextsDatabase = new KnexTextsDatabaseAdapter();

        const modifiedResponse = await processWengoodResponse(res, responseApi, req.body.prompt, tarotdatabase, model) ;

        console.log("modifiedResponse:", modifiedResponse);
        sendChunkResponse(res, JSON.stringify(modifiedResponse));

        res.write(`data: [DONE]\n\n`);
        res.flush();
        res.end();
        return;
    } else {
        sendChunkResponse(res, "error occured!");

        res.write(`data: [DONE]\n\n`);
        res.flush();
        res.end();
        return;

    }

}