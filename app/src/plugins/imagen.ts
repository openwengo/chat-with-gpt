import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters, ImagenRequestInstance } from "../core/chat/types";

export interface ImagenPluginOptions {
}

export const imagenPrefixes = ["/imagen"] ;

export class ImagenPlugin extends Plugin<ImagenPluginOptions> {
    describe(): PluginDescription {
        return {
            id: "imagen",
            name: "Routes /imagen",
            options: [
            ],
        };
    }

    async preprocessModelInput(messages: OpenAIMessage[], parameters: Parameters): Promise<{ messages: OpenAIMessage[]; parameters: Parameters; }> {
        
        const lastMessage = messages[messages.length -1 ];

        const prefixIndex = imagenPrefixes.findIndex(prefix => lastMessage.content.startsWith(prefix)) ;

        if (prefixIndex !== -1) {
            console.log("Imagen plugin detected input:", lastMessage.content);
            let lastImagenIndex = messages.map(item => item.role).lastIndexOf('imagen');

            let newMessages: OpenAIMessage[] = [] ;

            if (lastImagenIndex !== -1) {
                newMessages.push(messages[lastImagenIndex]);
            }

            newMessages.push(lastMessage);

            const paramRegexTemplate = (paramName: string) => new RegExp(`--${paramName}\\s*=?\\s*([^\\s]+)`, 'g');
            const extractValue = (regex: RegExp, command: string): string | undefined => {
                const match = [...command.matchAll(regex)];
                return match.length > 0 ? match[0][1] : undefined;
              };

            const aspectRatioRegex = paramRegexTemplate('ar');
            const negativePromptRegex = paramRegexTemplate('negative-prompt');

            const par = extractValue(aspectRatioRegex, lastMessage.content);
            const pnegative = extractValue(negativePromptRegex, lastMessage.content);

            const prompt = lastMessage.content.replace(aspectRatioRegex,'')
                .replace(negativePromptRegex,'')
                .substring(8) ;
            
            // force default ar to 16:9
            let aspectRatio: string = "16:9" ;

            if (par) {
                aspectRatio = par;
            }

            let imagenParameters: ImagenRequestInstance =  {
                aspectRatio: aspectRatio,
                prompt: prompt
            }

            if (pnegative) {
                imagenParameters.negativePrompt = pnegative;                
            }
            const newParameters: Parameters = {
                ...parameters,
                imagen: true,
                imagenParameters,
            }

            return {
                messages: newMessages,
                parameters: newParameters,
            }
        } else {

            let newMessages: OpenAIMessage[] = [] ;

            newMessages = messages.filter( m => (
                ( m.role !== 'imagen' ) && 
                ( ( m.role === 'user' && imagenPrefixes.findIndex( prefix => m.content.startsWith(prefix)) == -1 ) ||
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