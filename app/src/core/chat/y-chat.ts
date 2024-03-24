import * as Y from 'yjs';
import { Chat, Message, ToolMessage, ToolCall, ToolFunction } from './types';
import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import { MessageTree } from './message-tree';
import { get } from 'http';

const METADATA_KEY = 'metadata';
const IMPORTED_METADATA_KEY = 'imported-metadata';
const PLUGIN_OPTIONS_KEY = 'plugin-options';
const MESSAGES_KEY = 'messages';
const CONTENT_KEY = 'messages:content';
const IMAGES_KEY = 'messages:images';
const TOOLS_MESSAGE_KEY = 'messages:tools_message';
const TOOLS_CALL_KEY = 'messages:tools_calls';
const TOOLS_CALLABLE_KEY = 'messages:tools_callable';
const DONE_KEY = 'messages:done';

export class YChat {
    private callback: any;
    private pendingContent = new Map<string, string>();
    private pendingImages = new Map<string, string[]>();
    private pendingToolMessages = new Map<string, ToolMessage[]>(); // list of toolmessages
    private pendingToolsCalls = new Map<string, ToolCall[]>(); // list of tool calls
    private pendingCallableTools = new Map<string, ToolFunction[]>(); // list of callable functions
    private prefix = 'chat.' + this.id + '.';

    public static from(root: Y.Doc, id: string) {
        // const id = data.get('metadata').get('id') as string;
        return new YChat(id, root);
    }

    constructor(public readonly id: string, public root: Y.Doc) {
        this.purgeDeletedValues();
    }

    public observeDeep(callback: any) {
        this.callback = callback;
        this.metadata?.observeDeep(callback);
        this.pluginOptions?.observeDeep(callback);
        this.messages?.observeDeep(callback);
        this.content?.observeDeep(callback);
        this.images?.observeDeep(callback);
        this.toolCalls?.observeDeep(callback);
        this.toolMessages?.observeDeep(callback);
        this.callableTools?.observeDeep(callback);
        this.done?.observeDeep(callback);
    }

    public get deleted(): boolean {
        return this.metadata.get('deleted') || false;
    }

    public get metadata(): Y.Map<any> {
        return this.root.getMap<any>(this.prefix + METADATA_KEY);
    }

    public get importedMetadata(): Y.Map<any> {
        return this.root.getMap<any>(this.prefix + IMPORTED_METADATA_KEY);
    }

    public get pluginOptions(): Y.Map<any> {
        return this.root.getMap<any>(this.prefix + PLUGIN_OPTIONS_KEY);
    }

    public get messages(): Y.Map<Message> {
        return this.root.getMap<Message>(this.prefix + MESSAGES_KEY);
    }

    public get content(): Y.Map<Y.Text> {
        return this.root.getMap<Y.Text>(this.prefix + CONTENT_KEY);
    }

    public get images(): Y.Map<Y.Array<Y.Text>> {
        return this.root.getMap<Y.Array<Y.Text>>(this.prefix + IMAGES_KEY);
    }

    public get toolMessages(): Y.Map<Y.Array<Y.Text>> {
        return this.root.getMap<Y.Array<Y.Text>>(this.prefix + TOOLS_MESSAGE_KEY);
    }

    public get toolCalls(): Y.Map<Y.Array<Y.Text>> {
        return this.root.getMap<Y.Array<Y.Text>>(this.prefix + TOOLS_CALL_KEY);
    }

    public get callableTools(): Y.Map<Y.Array<Y.Text>> {
        return this.root.getMap<Y.Array<Y.Text>>(this.prefix + TOOLS_CALLABLE_KEY);
    }

    public get done(): Y.Map<boolean> {
        return this.root.getMap<boolean>(this.prefix + DONE_KEY);
    }

    public get title() {
        return (this.metadata.get('title') as string) || (this.importedMetadata.get('title') as string) || null;
    }

    public set title(value: string | null) {
        if (value) {
            this.metadata.set('title', value);
        }
    }

    public setPendingMessageContent(messageID: string, value: string) {
        this.pendingContent.set(messageID, value);
        this.callback?.();
    }

    public setMessageContent(messageID: string, value: string) {
        this.pendingContent.delete(messageID);
        this.content.set(messageID, new Y.Text(value));
    }

    public getMessageContent(messageID: string) {
        return this.pendingContent.get(messageID) || this.content.get(messageID)?.toString() || "";
    }

    public setPendingMessageImages(messageID: string, value: string[]) {
        this.pendingImages.set(messageID, value);
        this.callback?.();
    }

    public setMessageImages(messageID: string, value: string[]) {
        this.pendingImages.delete(messageID);
        const imagesArray: Y.Array<Y.Text> = new Y.Array<Y.Text>();

        this.images.set(messageID, imagesArray);
        // For each string URL, create a Y.Text and add it to imagesArray
        value.forEach(url => {
            const yText = new Y.Text();
            yText.insert(0, url); // Insert the string into the Y.Text
            imagesArray.push([yText]);
        });
        
        this.images.set(messageID, imagesArray);

    }

    public getMessageImages(messageID: string) {
        return this.pendingImages.get(messageID) ||  this.images.get(messageID)?.map(str => str.toString()) || [] ;
    }


    public setPendingToolMessages(messageID: string, value: ToolMessage[]) {
        this.pendingToolMessages.set(messageID, value);
        this.callback?.();
    }

    public setToolMessages(messageID: string, value: ToolMessage[]) {
        this.pendingToolMessages.delete(messageID);

        const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>();

        //this.toolCalls.set(messageID, toolsArray);
        // For each string function, create a Y.Text and add it to imagesArray
        value.forEach(tool => {
            const stringifiedTool: string = JSON.stringify(tool);
            const yText = new Y.Text(stringifiedTool);
            toolsArray.push([yText]);
        });        
        this.toolMessages.set(messageID, toolsArray);        
    }

    public getToolMessages(messageID: string) {
        if (this.pendingToolMessages.get(messageID)) {
            return this.pendingToolMessages.get(messageID);
        }

        if (( this.toolMessages.get(messageID) === undefined) ||  !(typeof this.toolMessages.get(messageID)?.map === 'function')) {
            return [];
        } else {
            const toolsAsStr = this.toolMessages.get(messageID)?.map(str => str.toString()) || [] ;

            const tools: ToolMessage[] = toolsAsStr.map(str => { const tool: ToolMessage = JSON.parse(str) ; return tool});
            return tools;
        }
    }

    public setPendingToolsCalls(messageID: string, value: ToolCall[]) {
        this.pendingToolsCalls.set(messageID, value);
        this.callback?.();
    }

    public setToolsCalls(messageID: string, value: ToolCall[]) {
        this.pendingToolsCalls.delete(messageID);
        
        const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>();

        //this.toolCalls.set(messageID, toolsArray);
        // For each string function, create a Y.Text and add it to imagesArray
        value.forEach(tool => {
            const stringifiedTool: string = JSON.stringify(tool);
            const yText = new Y.Text(stringifiedTool);
            toolsArray.push([yText]);
        });        
        this.toolCalls.set(messageID, toolsArray);
    }

    public getToolsCalls(messageID: string) {

        if (this.pendingToolsCalls.get(messageID)) {
            return this.pendingToolsCalls.get(messageID);
        }
        const toolsAsStr = this.toolCalls.get(messageID)?.map(str => str.toString()) || [] ;

        const tools: ToolCall[] = toolsAsStr.map(str => { const tool: ToolCall = JSON.parse(str) ; return tool});
        return tools;
    }

    public setPendingCallableTools(messageID: string, value: ToolFunction[]) {
        this.pendingCallableTools.set(messageID, value);
        this.callback?.();
    }

    public setCallableTools(messageID: string, value: ToolFunction[]) {
        this.pendingCallableTools.delete(messageID);
        
        const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>();

        this.callableTools.set(messageID, toolsArray);
        // For each string function, create a Y.Text and add it to imagesArray
        value.forEach(tool => {
            const yText = new Y.Text();
            yText.insert(0, JSON.stringify(tool)); // Insert the string into the Y.Text
            toolsArray.push([yText]);
        });
        
        this.callableTools.set(messageID, toolsArray);
    }

    public getCallableTools(messageID: string) {

        if ( this.pendingCallableTools.get(messageID)) {
            return this.pendingCallableTools.get(messageID) ;
        }
        const toolsAsStr =  this.callableTools.get(messageID)?.map(str => str.toString()) || [] ;

        const tools: ToolFunction[] = toolsAsStr.map(str => { const tool: ToolFunction = JSON.parse(str) ; return tool});

        return tools;
    }


    public onMessageDone(messageID: string) {
        this.done.set(messageID, true);
    }

    public getOption(pluginID: string, optionID: string): any {
        const key = pluginID + "." + optionID;
        return this.pluginOptions?.get(key) || null;
    }

    public setOption(pluginID: string, optionID: string, value: any) {
        const key = pluginID + "." + optionID;
        return this.pluginOptions.set(key, value);
    }

    public hasOption(pluginID: string, optionID: string) {
        const key = pluginID + "." + optionID;
        return this.pluginOptions.has(key);
    }

    public delete() {
        if (!this.deleted) {
            this.metadata.clear();
            //this.metadata['deleted'] = true;
            this.pluginOptions.clear();
            this.messages.clear();
            this.images.clear();
            this.toolCalls.clear();
            this.toolMessages.clear();
            this.callableTools.clear();
            this.content.clear();
            this.done.clear();
        } else {
            this.purgeDeletedValues();
        }
    }

    private purgeDeletedValues() {
        if (this.deleted) {
            if (this.metadata.size > 1) {
                for (const key of Array.from(this.metadata.keys())) {
                    if (key !== 'deleted') {
                        this.metadata.delete(key);
                    }
                }
            }
            if (this.pluginOptions.size > 0) {
                this.pluginOptions.clear();
            }
            if (this.messages.size > 0) {
                this.messages.clear();
            }
            if (this.content.size > 0) {
                this.content.clear();
            }
            if (this.images.size > 0) {
                this.images.clear();
            }
            if (this.toolMessages.size > 0) {
                this.toolMessages.clear();
            }
            if (this.toolCalls.size > 0) {
                this.toolCalls.clear();
            }
            if (this.callableTools.size > 0) {
                this.callableTools.clear();
            }
            if (this.done.size > 0) {
                this.done.clear();
            }
        }
    }
}

export class YChatDoc extends EventEmitter {
    public root = new Y.Doc();
    // public chats = this.root.getMap<Y.Map<any>>('chats');
    // public deletedChatIDs = this.root.getArray<string>('deletedChatIDs');
    public deletedChatIDsSet = new Set<string>();
    public options = this.root.getMap<Y.Map<any>>('options');
    private yChats = new Map<string, YChat>();

    private observed = new Set<string>();

    constructor() {
        super();

        this.root.whenLoaded.then(() => {
            const chatIDs = Array.from(this.root.getMap('chats').keys());
            for (const id of chatIDs) {
                this.observeChat(id);
            }
        });
    }

    private observeChat(id: string, yChat = this.getYChat(id)) {
        if (!this.observed.has(id)) {
            yChat?.observeDeep(() => this.emit('update', id));
            this.observed.add(id);
        }
    }

    // public set(id: string, chat: YChat) {
    //     this.chats.set(id, chat.data);

    //     if (!this.observed.has(id)) {
    //         this.getYChat(id)?.observeDeep(() => this.emit('update', id));
    //         this.observed.add(id);
    //     }
    // }

    public get chatIDMap() {
        return this.root.getMap('chatIDs');
    }

    public getYChat(id: string, expectContent = false) {
        let yChat = this.yChats.get(id);

        if (!yChat) {
            yChat = YChat.from(this.root, id);
            this.yChats.set(id, yChat);
        }

        if (expectContent && !this.chatIDMap.has(id)) {
            this.chatIDMap.set(id, true);
        }

        this.observeChat(id, yChat);

        return yChat;
    }

    public delete(id: string) {
        this.getYChat(id)?.delete();
        // TODO ? remove chat from this.root.getMap('chatIDs'); ?
    }

    public has(id: string) {
        if (this.chatIDMap.has(id) && YChat.from(this.root, id).deleted) {
            console.log(`chatidmap ${id} is deleted`);
        }
        return this.chatIDMap.has(id) && !YChat.from(this.root, id).deleted;
    }

    public getChatIDs() {
        return Array.from(this.chatIDMap.keys());
        /*
        const allChats = Array.from(this.chatIDMap.keys());
        let nonDeletedChats = 0;
        let deletedChats = 0;
        let undefinedChats = 0
        let nb_meta_deleted = 0;
        let nb_meta_title = 0;
        for(const id of allChats) {
            const meta = YChat.from(this.root,id).metadata ;
            let title_found = false;
            let deleted_found = false;
            for (const key of Array.from(meta.keys())) {
                if (key === 'deleted') {
                    deleted_found = true;
                    nb_meta_deleted += 1;
                } else if ( key === 'title') {
                    title_found = true;
                    nb_meta_title += 1;
                }
            }
                    
            if (YChat.from(this.root, id).deleted === undefined) {
                undefinedChats += 1;
            } else if (YChat.from(this.root, id).deleted === true) {
                deletedChats += 1;
            } else if (YChat.from(this.root, id).deleted === false) {
                nonDeletedChats += 1;
            }
        }
        console.log(`getChatIDs: ${nonDeletedChats} vs ${deletedChats} vs ${undefinedChats} vs ${nb_meta_deleted} vs ${nb_meta_title}`);
        return Array.from(this.chatIDMap.keys());
        */
    }

    public getAllYChats() {
        return this.getChatIDs().map(id => this.getYChat(id)!);
    }

    public transact(cb: () => void) {
        return this.root.transact(cb);
    }

    public addMessage(message: Message) {
        const chat = this.getYChat(message.chatID, true);

        if (!chat) {
            throw new Error('Chat not found');
        }

        this.transact(() => {
            chat.messages.set(message.id, {
                ...message,
                content: '',
                images: []
            });
            chat.content.set(message.id, new Y.Text(message.content || ''));
            if ( message.images && message.images.length > 0) {
                const imagesArray: Y.Array<Y.Text> = new Y.Array<Y.Text>()
                
                message.images.map( url => { 
                    const yText = new Y.Text();
                    yText.insert(0,url);
                    imagesArray.push([yText])
                    }
                );
                chat.images.set(message.id, imagesArray);
            }
            if ( message.toolCalls && message.toolCalls.length > 0) {
                const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>()
                
                message.toolCalls.map( toolMessage => { 
                    const yText = new Y.Text(JSON.stringify(toolMessage));
                    toolsArray.push([yText])
                    }
                );
                chat.toolCalls.set(message.id, toolsArray);
            }
            if ( message.toolMessages && message.toolMessages.length > 0) {
                const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>()
                
                message.toolMessages.map( toolMessage => { 
                    const yText = new Y.Text();
                    yText.insert(0,JSON.stringify(toolMessage));
                    toolsArray.push([yText])
                    }
                );
                chat.toolMessages.set(message.id, toolsArray);
            }

            if ( message.callableTools && message.callableTools.length > 0) {
                const toolsArray: Y.Array<Y.Text> = new Y.Array<Y.Text>()
                
                message.callableTools.map( toolMessage => { 
                    const yText = new Y.Text();
                    yText.insert(0,JSON.stringify(toolMessage));
                    toolsArray.push([yText])
                    }
                );
                chat.callableTools.set(message.id, toolsArray);
            }

            if (message.done) {
                chat.done.set(message.id, message.done);
            }
        });
    }

    public createYChat(id = uuidv4()) {
        // return new YChat(id, this.root);
        // this.set(id, chat);
        return id;
    }

    public getMessageTree(chatID: string): MessageTree {
        const tree = new MessageTree();
        const chat = this.getYChat(chatID);

        chat?.messages?.forEach(m => {
            try {
                const content = chat.getMessageContent(m.id);
                const images = chat.getMessageImages(m.id);
                const tool_calls = chat.getToolsCalls(m.id);
                const tool_messages = chat.getToolMessages(m.id);
                const callable_tools = chat.getCallableTools(m.id);
                const done = chat.done.get(m.id) || false;
                tree.addMessage(m, content, done, images, tool_calls , tool_messages, callable_tools);
            } catch (e) {
                console.warn(`failed to load message ${m.id}`, e);
            }
        });

        return tree;
    }

    public getMessagesPrecedingMessage(chatID: string, messageID: string) {
        const tree = this.getMessageTree(chatID);
        const message = tree.get(messageID);

        if (!message) {
            throw new Error("message not found: " + messageID);
        }

        const messages: Message[] = message.parentID
            ? tree.getMessageChainTo(message.parentID)
            : [];

        return messages;
    }

    public getChat(id: string): Chat {
        const chat = this.getYChat(id);
        const tree = this.getMessageTree(id);
        return {
            id,
            messages: tree,
            title: chat.title,
            metadata: {
                ...chat.importedMetadata.toJSON(),
                ...chat.metadata.toJSON(),
            },
            pluginOptions: chat?.pluginOptions?.toJSON() || {},
            deleted: !chat.deleted,
            created: tree.first?.timestamp || 0,
            updated: tree.mostRecentLeaf()?.timestamp || 0,
        }
    }

    public getOption(pluginID: string, optionID: string): any {
        const key = pluginID + "." + optionID;
        return this.options.get(key);
    }

    public setOption(pluginID: string, optionID: string, value: any) {
        const key = pluginID + "." + optionID;
        return this.options.set(key, value);
    }
}