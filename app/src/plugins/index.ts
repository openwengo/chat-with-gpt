import Plugin from "../core/plugins";

import { SystemPromptPlugin } from "./system-prompt";
import { ExtendedSystemPromptPlugin } from "./system-prompt-extend" ;
import { TitlePlugin } from "./titles";
import { ContextTrimmerPlugin } from "./trimmer";
import { MidjourneyPlugin } from "./midjourney" ;
import { Dalle3Plugin } from "./dalle3" ;
import { ImagenPlugin } from "./imagen" ;

import ElevenLabsPlugin from "../tts-plugins/elevenlabs";
import WebSpeechPlugin from "../tts-plugins/web-speech";

export const registeredPlugins: Array<typeof Plugin<any>> = [
    MidjourneyPlugin,
    Dalle3Plugin,
    ImagenPlugin,
    SystemPromptPlugin,
    ExtendedSystemPromptPlugin,    
    TitlePlugin,    
    WebSpeechPlugin,
    ElevenLabsPlugin,
];