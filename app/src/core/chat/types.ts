import { MessageTree } from "./message-tree";


export interface MidjourneyMessageOption {
    type: number;
    style: number;
    label: string;
    custom: string;
}

export interface MidjourneyMessage {
    uri: string;
    progress: string;
    id?: string;
    hash?: string;
    flags?: number;
    options?: MidjourneyMessageOption[];
}

export interface MidjourneyParameters {
    midjourneyMethod: string;
    id?: string;
    uri?: string;
    hash?: string;
    index?: number;
    flags?: number;
    level?: string;
}

export interface Parameters {
    temperature: number;
    apiKey?: string;
    initialSystemPrompt?: string;
    model: string;
    wengoplusmode?: boolean;
    midjourney?: boolean;
    midjourneyParameters?: MidjourneyParameters;

}



export interface Message {
    id: string;
    chatID: string;
    parentID?: string;
    timestamp: number;
    role: string;
    model?: string;
    content: string;
    parameters?: Parameters;
    done?: boolean;
}

export interface UserSubmittedMessage {
    chatID: string;
    parentID?: string;
    content: string;
    requestedParameters: Parameters;
}

export interface OpenAIMessage {
    role: string;
    content: string;
}

export function getOpenAIMessageFromMessage(message: Message): OpenAIMessage {
    return {
        role: message.role,
        content: message.content,
    };
}

export interface Chat {
    id: string;
    messages: MessageTree;
    metadata?: Record<string, any>;
    pluginOptions?: Record<string, any>;
    title?: string | null;
    created: number;
    updated: number;
    deleted?: boolean;
}

export function serializeChat(chat: Chat): string {
    return JSON.stringify({
        ...chat,
        messages: chat.messages.serialize(),
    });
}

export function deserializeChat(serialized: string) {
    const chat = JSON.parse(serialized);
    chat.messages = new MessageTree(chat.messages);
    return chat as Chat;
}