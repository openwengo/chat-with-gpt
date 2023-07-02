import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, MidjourneyParameters } from "../core/chat/types";
import { MidjourneyMessage } from '../core/chat/types' ;

export interface MidjourneyPluginOptions {
}

export const midjourneyPrefixes = ["/imagine", "/midjourneycustom"] ; // "/variations", "/upscale", "/zoomout"

export class MidjourneyPlugin extends Plugin<MidjourneyPluginOptions> {
    describe(): PluginDescription {
        return {
            id: "midjourney",
            name: "Routes /imagine, /midjourneycustom, /variations, /upscale, /zoomout",
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

            /*
            if ((prefixIndex > 0 ) && ( prefixIndex < 3)) {
                if (lastMidjourneyIndex !== -1 ) {
                    let midjourneyMessage: MidjourneyMessage = { uri: "", progress:"error"} ;

                    try {
                        midjourneyMessage = JSON.parse(messages[lastMidjourneyIndex].content);

                        console.log("Found image generation:", midjourneyMessage);
                        
                    } catch (error) {
                        console.log("Failed to parse midjourney message:", messages[lastMidjourneyIndex].content, "with error:", error) ;
                        throw new Error("Internal error, generation can't be parsed");
                    }

                    let messageSplit = lastMessage.content.split(" ") ;

                    if ( messageSplit.length < 2 ) {
                        throw new Error(`Syntax is ${messageSplit[0]} <image index>`);
                    }
                    let imageIndex: number = Number(messageSplit[1]);

                    if ( (imageIndex < 1) || ( imageIndex > 4) ) {
                        throw new Error("Image index must be between 1 and 4") ;
                    }
                    midjourneyParameters = {
                        ...midjourneyParameters,
                        uri: midjourneyMessage.uri,
                        id: midjourneyMessage.id,
                        hash: midjourneyMessage.hash,
                        index: imageIndex,
                        flags: midjourneyMessage.flags,

                    }

                } else {
                    throw new Error("You must /imagine before /variations or /upscale or /zoomout") ;
                }
            } else if ( prefixIndex == 3 ) { // zoomout
                if (lastMidjourneyIndex !== -1 ) {
                    let midjourneyMessage: MidjourneyMessage = { uri: "", progress:"error"} ;

                    try {
                        midjourneyMessage = JSON.parse(messages[lastMidjourneyIndex].content);

                        console.log("Found image generation:", midjourneyMessage);
                        
                    } catch (error) {
                        console.log("Failed to parse midjourney message:", messages[lastMidjourneyIndex].content, "with error:", error) ;
                        throw new Error("Internal error, generation can't be parsed");
                    }

                    let messageSplit = lastMessage.content.split(" ") ;

                    if ( messageSplit.length < 2 ) {
                        throw new Error(`Syntax is ${messageSplit[0]} <"high" | "low" | "2x" | "1.5x">`);
                    }
                    let zoomLevel: string = messageSplit[1];

                    const zoomLevels = [ "high", "low", "2x", "1.5x" ] ;

                    const zoomIndex = zoomLevels.indexOf( zoomLevel ) ;


                    if (zoomIndex < 0) {
                        zoomLevel = "2x";
                    }

                    midjourneyParameters = {
                        ...midjourneyParameters,
                        uri: midjourneyMessage.uri,
                        id: midjourneyMessage.id,
                        hash: midjourneyMessage.hash,
                        level: zoomLevel,
                        flags: midjourneyMessage.flags,

                    }

                } else {
                    throw new Error("You must /imagine before /zoomout") ;
                }            

            }
            */
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

            console.log("Not a midjourney command, filter out:", messages);
            // remove midjourney messages from history
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