import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, TarotParameters } from "../core/chat/types";

export interface TarotPluginOptions {
}

export const tarotPrefixes = ["/tarotouinon"] ; // "/variations", "/upscale", "/zoomout"

export class TarotPlugin extends Plugin<TarotPluginOptions> {
    describe(): PluginDescription {
        return {
            id: "tarot",
            name: "Routes /tarotdujour",
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

        const prefixIndex = tarotPrefixes.findIndex(prefix => lastMessage.content.startsWith(prefix)) ;

        if (prefixIndex !== -1) {
            console.log("Tarot plugin detected input:", lastMessage.content);
            let lastTarotIndex = messages.map(item => item.role).lastIndexOf('tarot');

            let newMessages: OpenAIMessage[] = [] ;

            if (lastTarotIndex !== -1) {
                newMessages.push(messages[lastTarotIndex]);
            }

            newMessages.push(lastMessage);
            const jsonString = lastMessage.content.slice(tarotPrefixes[prefixIndex].length).trim();

            const jsonObject = JSON.parse(jsonString);

            let tarotParameters: TarotParameters =  {
                game: tarotPrefixes[prefixIndex],
                card1: jsonObject.card1,
                card2: jsonObject.card2,
                card3: jsonObject.card3,
                lang: jsonObject.lang,
                prompt: jsonObject.prompt
            }

            const newParameters: Parameters = {
                ...parameters,
                tarot: true,
                tarotParameters,
            }

            return {
                messages: newMessages,
                parameters: newParameters,
            }
        } else {

            let newMessages: OpenAIMessage[] = [] ;

            newMessages = messages.filter( m => (
                ( m.role !== 'tarot' ) && 
                ( ( m.role === 'user' && tarotPrefixes.findIndex( prefix => m.content.startsWith(prefix)) == -1 ) ||
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