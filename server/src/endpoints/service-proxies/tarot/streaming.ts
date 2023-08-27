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
const { WebBrowser } = require("langchain/tools/webbrowser");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { BaseCallbackHandler } = require("langchain/callbacks");
const { AWSLambda } = require("langchain/tools/aws_lambda");
const { DynamicTool } = require("langchain/tools");
const {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
  } = require("langchain/prompts");

async function callWengoodApi(data: {
  lang: string;
  card1: number;
  card2: number;
  card3: number;
  card4: number;
  card5: number;
}) {
  // Constructing the URL with the required parameters
  const url = new URL('https://api.wengood.com/reporting/generateValues');
  url.searchParams.append('_t', '7b3dc948980cfa85fad3e98b2aaaed8d'); // You can modify this value
  url.searchParams.append('userGender', 'm'); // Modify as needed
  url.searchParams.append('userFirstname', 'Soan'); // Modify as needed
  url.searchParams.append('userLastname', 'Blanchard'); // Modify as needed
  url.searchParams.append('slug', 'tarot-oui-non-2015'); // Modify as needed
  url.searchParams.append('purchaseCulture', data.lang);
  url.searchParams.append('userCard1', data.card1.toString());
  url.searchParams.append('userCard2', data.card2.toString());
  url.searchParams.append('userCard3', data.card3.toString());
  url.searchParams.append('userCard4', data.card4.toString());
  url.searchParams.append('userCard5', data.card5.toString());

  // Adding staticKeys parameters
  for (let i = 1; i <= 3; i++) {
    url.searchParams.append(`staticKeys[card_${i}][key]`, 'TarotCardName');
    url.searchParams.append(`staticKeys[card_${i}][context][Card]`, (i * 3).toString());
  }

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
  newResponse.values=cloneWithoutAttributes( responseData.values, "XLHTML") ;

  // Iterate through the keys starting with "XLHTML"
  for (const key of Object.keys(responseData.values)) {
    if (key.startsWith('XLHTML')) {
      const textContent = responseData.values[key];

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

    if ( req.body.card1 ) {
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
        
        let responseApi = await callWengoodApi( {
            lang: req.body.lang,
            card1: req.body.card1,
            card2: req.body.card2,
            card3: req.body.card3,
            card4: req.body.card4 ? req.body.card4 : 4,
            card5: req.body.card5 ? req.body.card5 : 5,
        })

        responseApi['values']['realcard1'] = req.body.card1;
        responseApi['values']['realcard2'] = req.body.card2;
        responseApi['values']['realcard3'] = req.body.card3;

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

    const eventSource = new EventSource('https://api.openai.com/v1/chat/completions', {
        method: "POST",
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...req.body,
            stream: true,
        }),
    });

    eventSource.addEventListener('message', async (event: any) => {
        //console.log("new message:", `data: ${event.data}\n\n`);
        res.write(`data: ${event.data}\n\n`);
        res.flush();

        if (event.data === '[DONE]') {
            res.end();
            eventSource.close();

            const totalTokens = countTokensForMessages([
                ...messages,
                {
                    role: "assistant",
                    content: completion,
                },
            ]);
            const completionTokens = totalTokens - promptTokens;
            console.log(`prompt tokens: ${promptTokens}, completion tokens: ${completionTokens}, model: ${req.body.model}`);
            return;
        }

        try {
            const chunk = parseResponseChunk(event.data);
            if (chunk.choices && chunk.choices.length > 0) {
                completion += chunk.choices[0]?.delta?.content || '';
            }
        } catch (e) {
            console.error(e);
        }
    });

    eventSource.addEventListener('error', (event: any) => {
        console.log("Error!", event);
        sendChunkResponse(res, `An error occured. Please try again`);
        res.end();
        eventSource.close();
    });

    eventSource.addEventListener('abort', (event: any) => {
        console.log("Abort!");
        res.end();
    });

    req.on('close', () => {
        eventSource.close();
    });

    res.on('error', e => {
        eventSource.close();
    });
}

function parseResponseChunk(buffer: any) {
    const chunk = buffer.toString().replace('data: ', '').trim();

    if (chunk === '[DONE]') {
        return {
            done: true,
        };
    }

    const parsed = JSON.parse(chunk);

    return {
        id: parsed.id,
        done: false,
        choices: parsed.choices,
        model: parsed.model,
    };
}