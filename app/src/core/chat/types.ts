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
    descriptions?: string[];
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

export interface DalleImageObject {
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
}

export interface DalleImageList {
    created: number;
    data: DalleImageObject[];
}

export interface Dalle3Message {
    images?: DalleImageList;
    error?: string;
}

export interface Dalle3Parameters {
    format: "portrait" | "landscape" | "square";
    style: "vivid" | "natural";
    quality: "standard" | "hd";
    prompt: string;
}

export interface TarotParameters {
    game: string;
    card1: string;
    card2: string;
    card3: string;
    card4?: number;
    card5?: number;
    lang: string;
    prompt: string;
}

export interface GHParameters {
    slug: string;
    lang: string;
    userNatalSign: number;
    userRisingSign: number;
    prompt: string;
}



export interface Parameters {
    temperature: number;
    apiKey?: string;
    initialSystemPrompt?: string;
    model: string;
    wengoplusmode?: boolean;
    midjourney?: boolean;
    midjourneyParameters?: MidjourneyParameters;
    tarot?: boolean;
    tarotParameters?: TarotParameters;
    gh?: boolean;
    ghParameters?: GHParameters;
    dalle3?: boolean;
    dalle3Parameters?: Dalle3Parameters;
}



export interface Message {
    id: string;
    chatID: string;
    parentID?: string;
    timestamp: number;
    role: string;
    model?: string;
    content: string;
    images?: string[];
    parameters?: Parameters;
    done?: boolean;
}

export interface UserSubmittedMessage {
    chatID: string;
    parentID?: string;
    content: string;
    images?: string[];
    requestedParameters: Parameters;
}

export interface OpenAIMessage {
    role: string;
    content: string;
    images?: string[];
}

export function getOpenAIMessageFromMessage(message: Message): OpenAIMessage {
    
    
    if (!message.images) {
        return {
            role: message.role,
            content: message.content,        
        };
    } else {
        return {
            role: message.role,
            content: message.content,        
            images: message.images
        };
    }
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