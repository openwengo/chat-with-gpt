import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, MidjourneyParameters } from "../core/chat/types";
import { MidjourneyMessage } from '../core/chat/types' ;

export interface MidjourneyPluginOptions {
}

export const midjourneyPrefixes = ["/imagine", "/midjourneycustom", "/describe"] ; // "/variations", "/upscale", "/zoomout"

export class MidjourneyPlugin extends Plugin<MidjourneyPluginOptions> {
    describe(): PluginDescription {
        return {
            id: "midjourney",
            name: "Routes /imagine, /midjourneycustom, /describe",
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

        const prefixIndex = midjourneyPrefixes.findIndex(prefix => lastMessage.content.startsWith(prefix)) ;

        if (prefixIndex !== -1) {
            console.log("Midjourney plugin detected input:", lastMessage.content);
            let lastMidjourneyIndex = messages.map(item => item.role).lastIndexOf('midjourney');

            let newMessages: OpenAIMessage[] = [] ;

            if (lastMidjourneyIndex !== -1) {
                newMessages.push(messages[lastMidjourneyIndex]);
            }

            newMessages.push(lastMessage);

            let midjourneyParameters: MidjourneyParameters =  {
                midjourneyMethod: midjourneyPrefixes[prefixIndex]
            }
            
            const newParameters: Parameters = {
                ...parameters,
                midjourney: true,
                midjourneyParameters,
            }

            return {
                messages: newMessages,
                parameters: newParameters,
            }
        } else {

            let newMessages: OpenAIMessage[] = [] ;

            newMessages = messages.filter( m => (
                ( m.role !== 'midjourney' ) && 
                ( ( m.role === 'user' && midjourneyPrefixes.findIndex( prefix => m.content.startsWith(prefix)) == -1 ) ||
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