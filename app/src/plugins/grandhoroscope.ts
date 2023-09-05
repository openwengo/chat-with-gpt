import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, GHParameters } from "../core/chat/types";

export interface GHPluginOptions {
}

export const ghPrefixes = ["/gh"] ; // "/variations", "/upscale", "/zoomout"

export class GHPlugin extends Plugin<GHPluginOptions> {
    describe(): PluginDescription {
        return {
            id: "gh",
            name: "Routes /gh",
            options: [
                // {
                //     id: 'maxTokens',
                //     displayOnSettingsScreen: "chat",
                //     defaultValue: 2048,
                //     scope: "chat",
                //     renderProps: (value, options) => ({
                //         label: `Include a maximum of ${value} tokens`,
                //         type: "slider",
                //         min: 512,
                //         max: maxTokensByModel[options.getOption('parameters', 'model')] || 2048,
                //         step: 512,
                //     }),
                //     validate: (value, options) => {
                //         const max = maxTokensByModel[options.getOption('parameters', 'model')] || 2048;
                //         return value < max;
                //     },
                //     displayInQuickSettings: {
                //         name: "Max Tokens",
                //         displayByDefault: false,
                //         label: value => `Max tokens: ${value}`,
                //     },
                // },
            ],
        };
    }

    async preprocessModelInput(messages: OpenAIMessage[], parameters: Parameters): Promise<{ messages: OpenAIMessage[]; parameters: Parameters; }> {
        
        const lastMessage = messages[messages.length -1 ];

        const prefixIndex = ghPrefixes.findIndex(prefix => lastMessage.content.startsWith(prefix)) ;

        if (prefixIndex !== -1) {
            console.log("GH plugin detected input:", lastMessage.content);
            let lastGHIndex = messages.map(item => item.role).lastIndexOf('gh');

            let newMessages: OpenAIMessage[] = [] ;

            if (lastGHIndex !== -1) {
                newMessages.push(messages[lastGHIndex]);
            }

            newMessages.push(lastMessage);
            const jsonString = lastMessage.content.slice(ghPrefixes[prefixIndex].length).trim();

            const jsonObject = JSON.parse(jsonString);

            let ghParameters: GHParameters =  {
                slug: jsonObject.slug,
                lang: jsonObject.lang,
                userNatalSign: jsonObject.userNatalSign,
                userRisingSign: jsonObject.userRisingSign,
                prompt: jsonObject.prompt,
            }

            const newParameters: Parameters = {
                ...parameters,
                gh: true,
                ghParameters,
            }

            return {
                messages: newMessages,
                parameters: newParameters,
            }
        } else {

            console.log("Not a gh command, filter out:", messages);
            // remove midjourney messages from history
            let newMessages: OpenAIMessage[] = [] ;

            newMessages = messages.filter( m => (
                ( m.role !== 'gh' ) && 
                ( ( m.role === 'user' && ghPrefixes.findIndex( prefix => m.content.startsWith(prefix)) == -1 ) ||
                  ( m.role !== 'user')
                )
                ));

            return {
                messages: newMessages,
                parameters,
            }            
        }
    }


    async postprocessModelOutput(message: OpenAIMessage, context: OpenAIMessage[], parameters: Parameters, done: boolean): Promise<OpenAIMessage> {

        return message;
    }
}