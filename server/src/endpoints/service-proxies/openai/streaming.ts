// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express from 'express';
import { apiKey } from ".";
import { countTokensForMessages } from "./tokenizer";
import { v4 as uuidv4 } from  'uuid' ;
import { Agent } from "http";
//const { OpenAI } = require("langchain/llms/openai");
const { Calculator } = require("langchain/tools/calculator");
const { initializeAgentExecutorWithOptions } = require("langchain/agents") ;
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { WebBrowser } = require("langchain/tools/webbrowser");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { BaseCallbackHandler } = require("langchain/callbacks");
const { AWSLambda } = require("langchain/tools/aws_lambda");

//const { HumanChatMessage, SystemChatMessage } = require("langchain/schema");



function sendChunkResponse(res: express.Response, message: string) {
    const data = `data: {"id":"send${uuidv4()}","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(message)},"index":0,"finish_reason":null}}]}\n\n`;
    //console.log("data:", data);
    res.write(data);
    res.flush();
}

class MyCallbackHandler extends BaseCallbackHandler {
    name = "MyCallbackHandler";
    constructor(res: express.Response, input?: any) {
        super(input);
        this.res = res;
    }

    async handleChainStart(chain: { name: string }) {
      console.log(`Entering new ${chain.name} chain...`);
      sendChunkResponse(this.res, `\n==>\n`);
    }
  
        /*
    async handleLLMNewToken(token: string) {
        sendChunkResponse(this.res, token);
    }
    */
    async handleChainEnd(_output: any) {
    sendChunkResponse(this.res, `\n<==\n`);
      console.log("mycallback Finished chain.");
    }
  
    async handleAgentAction(action: any) {
    sendChunkResponse(this.res, `Action(log): ${action.log}`);
      console.log("mycallback", action.log);
    }
  
    async handleToolEnd(output: string) {
    sendChunkResponse(this.res, `\nTool end:: ${output}`);
      console.log("mycallback",output);
    }
  
    async handleText(text: string) {
    sendChunkResponse(this.res, `\nhandleText ${text} ...`);
      console.log("mycallback",text);
    }
  
    async handleAgentEnd(action: any) {
      console.log("mycallback",action.log);
    }
  }

const astroDataTool = new AWSLambda({
    name: "astrological-aspects",
    description: "Retrieves astrological aspects at give date and a specific location. Pass the date as parameter with this format: YYYY-MM-DD",
    region: "eu-west-3",
    functionName: "lambda_astrodata"
});

async function chainPreprocess(message: string, res: express.Response, modelName?: string) {
    const model = new ChatOpenAI({openAIApiKey: `${apiKey}`,
        streaming: true,
        temperature: 0,
        modelName: modelName ? modelName : "gpt-3.5-turbo",
        callbacks: [{
            handleLLMNewToken(token: string) {
              sendChunkResponse(res, token);
            },
          },]});
    const embeddings = new OpenAIEmbeddings({openAIApiKey: `${apiKey}`}
      );
    const tools =  [
        //new Calculator(),
        new WebBrowser({model, embeddings}),
        astroDataTool
    ]
    //const agent = ChatAgent.fromLLMAndTools(model, tools);
    const callbackHandler = new MyCallbackHandler(res);

    const executor = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "chat-zero-shot-react-description",
        agentArgs: {
            //prefix: 'Check if you can use a tool to preprocess this question. If yes, just use the tool, but do not answer the question. Here is the list of tools:',
            //suffix: `If no tool is appropriate do not answer the question and say: No tool is appropriate.Begin! Reminder to always use the exact characters \`Final Answer\` when responding.`,
            callbacks: [callbackHandler,]
        },        

    });
    console.log("Loaded agent.", executor);
    executor.verbose = true;
    executor.maxIterations = 6;
    executor.returnIntermediateSteps = true;


    const input = message ;

    console.log(`Executing with input "${input}`);
    const result = await executor.call({input}) ;
    console.log("end executor");
    /*
    console.log(`Got output ${result.output}`, result);

    let toolContext =''
    for ( const step of result.intermediateSteps) {
        console.log("action:", step.action, "observation:", step.observation);
        if ( (step.observation != "I don't know how to do that.") &&
             (!step.observation.includes("not a valid tool"))
            ) {
            toolContext += `${step.action.log}Observation: ${step.observation}\n`
        }
    }

    if ( toolContext !== '') {
        return `\nHere are some results which might help to answer:\n${toolContext}\n========\n`
    } else {
        return '';
    }
    */
   return '';

}


export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const messages = req.body.messages;
    const promptTokens = countTokensForMessages(messages);

    console.log("wengoplusmode:", req.body.wengoplusmode);
    console.log("temperature:", req.body.temperature);
    console.log("model:", req.body.model);    

    let completion = '';
    console.log("messages:", messages);

    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

    if ( req.body.wengoplusmode ) {
        const preprocessedMessage = await chainPreprocess(lastMessage.content, res, req.body.model);

        if (preprocessedMessage !== '') {
            sendChunkResponse(res, preprocessedMessage);        
            messages[messages.length -1 ].content = `${lastMessage.content}\n${preprocessedMessage}` ;
            console.log("New message:", messages[messages.length -1 ].content );
        }
        sendChunkResponse(res, `Chain has completed`);
        res.write(`data: [DONE]\n\n`);
        res.flush();
        res.end();
        return;
    } 

    delete req.body.wengoplusmode;
    
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