// @ts-ignore
import { EventSource } from "launchdarkly-eventsource";
import express from 'express';
import { apiKey } from ".";
import { countTokensForMessages } from "./tokenizer";
//const { OpenAI } = require("langchain/llms/openai");
const { Calculator } = require("langchain/tools/calculator");
const { initializeAgentExecutorWithOptions } = require("langchain/agents") ;
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { WebBrowser } = require("langchain/tools/webbrowser");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");

//const { HumanChatMessage, SystemChatMessage } = require("langchain/schema");




async function chainPreprocess(message: string) {
    const model = new ChatOpenAI({openAIApiKey: `${apiKey}`, temperature: 0});
    const embeddings = new OpenAIEmbeddings({openAIApiKey: `${apiKey}`}
      );
    const tools =  [
        new Calculator(),
        new WebBrowser({model, embeddings})
    ]
    //const agent = ChatAgent.fromLLMAndTools(model, tools);

    const executor = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "chat-zero-shot-react-description",
        agentArgs: {
            prefix: 'Check if you can use a tool to preprocess this question. Here is the list of tools:',
            suffix: `If no tool is appropriate do not answer the question and say: No tool is appropriate.Begin! Reminder to always use the exact characters \`Final Answer\` when responding.`,
        }

    });
    console.log("Loaded agent.", executor);
    executor.verbose = true;
    executor.maxIterations = 2;
    executor.returnIntermediateSteps = true;


    const input = message ;

    console.log(`Executing with input "${input}`);
    const result = await executor.call({input}) ;
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
        return `Here are some results which might help to answer:\n${toolContext}`
    } else {
        return '';
    }

}

export async function streamingHandler(req: express.Request, res: express.Response) {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const messages = req.body.messages;
    const promptTokens = countTokensForMessages(messages);

    let completion = '';
    console.log("messages:", messages);

    const lastMessage = messages[messages.length -1 ];
    console.log("LastMessage:", lastMessage);

    const preprocessedMessage = await chainPreprocess(lastMessage.content);

    if (preprocessedMessage !== '') {
        const data = `data: {"id":"preprocessingresults","object":"chat.completion.chunk","choices":[{"delta":{"content":${JSON.stringify(preprocessedMessage)},"index":0,"finish_reason":null}}]}\n\n`;
        console.log("data:", data);
        res.write(data);
        res.flush()
        messages[messages.length -1 ].content = `${lastMessage.content}\n${preprocessedMessage}` ;
        console.log("New message:", messages[messages.length -1 ].content );
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
            // console.log(`prompt tokens: ${promptTokens}, completion tokens: ${completionTokens}, model: ${req.body.model}`);
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
        res.end();
    });

    eventSource.addEventListener('abort', (event: any) => {
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