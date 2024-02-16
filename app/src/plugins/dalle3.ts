import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, Dalle3Parameters } from "../core/chat/types";

export interface Dalle3PluginOptions {
}

export const dalle3Prefixes = ["/dalle"] ;

export class Dalle3Plugin extends Plugin<Dalle3PluginOptions> {
    describe(): PluginDescription {
        return {
            id: "dalle3",
            name: "Routes /dalle",
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

        const prefixIndex = dalle3Prefixes.findIndex(prefix => lastMessage.content.startsWith(prefix)) ;

        if (prefixIndex !== -1) {
            console.log("Dalle3 plugin detected input:", lastMessage.content);
            let lastDalle3Index = messages.map(item => item.role).lastIndexOf('dalle3');

            let newMessages: OpenAIMessage[] = [] ;

            if (lastDalle3Index !== -1) {
                newMessages.push(messages[lastDalle3Index]);
            }

            newMessages.push(lastMessage);

            const paramRegexTemplate = (paramName: string) => new RegExp(`--${paramName}\\s*=?\\s*([^\\s]+)`, 'g');
            const extractValue = (regex: RegExp, command: string): string | undefined => {
                const match = [...command.matchAll(regex)];
                return match.length > 0 ? match[0][1] : undefined;
              };

            const formatRegex = paramRegexTemplate('format');
            const styleRegex = paramRegexTemplate('style');
            const qualityRegex = paramRegexTemplate('quality');

            const pformat = extractValue(formatRegex, lastMessage.content);
            const pstyle = extractValue(styleRegex, lastMessage.content);
            const pquality = extractValue(qualityRegex, lastMessage.content);              

            const prompt = lastMessage.content.replace(formatRegex,'')
                .replace(styleRegex,'')
                .replace(qualityRegex,'')
                .substring(8) ;
            let format: "portrait" | "landscape" = "landscape" ;

            if ((pformat === 'portrait')) {
                format = "portrait"
            }

            let style: "vivid" | "natural" = "vivid" ;

            if ((pstyle === 'natural')) {
                style = "natural"
            }

            let quality: "hd" | "standard" = "hd" ;

            if ((pquality === 'standard')) {
                quality = "standard"
            }

            let dalle3Parameters: Dalle3Parameters =  {
                format: format,
                style: style,
                quality: quality,
                prompt: prompt
            }

            const newParameters: Parameters = {
                ...parameters,
                dalle3: true,
                dalle3Parameters,
            }

            return {
                messages: newMessages,
                parameters: newParameters,
            }
        } else {

            console.log("Not a dalle3 command, filter out:", messages);
            // remove midjourney messages from history
            let newMessages: OpenAIMessage[] = [] ;

            newMessages = messages.filter( m => (
                ( m.role !== 'dalle3' ) && 
                ( ( m.role === 'user' && dalle3Prefixes.findIndex( prefix => m.content.startsWith(prefix)) == -1 ) ||
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