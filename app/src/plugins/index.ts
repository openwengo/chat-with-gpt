import Plugin from "../core/plugins";

import { SystemPromptPlugin } from "./system-prompt";
import { TitlePlugin } from "./titles";
import { ContextTrimmerPlugin } from "./trimmer";
import { MidjourneyPlugin } from "./midjourney" ;
import { Dalle3Plugin } from "./dalle3" ;
import { TarotPlugin } from "./tarot" ;
import { GHPlugin } from "./grandhoroscope" ;

import ElevenLabsPlugin from "../tts-plugins/elevenlabs";
import WebSpeechPlugin from "../tts-plugins/web-speech";

export const registeredPlugins: Array<typeof Plugin<any>> = [
    MidjourneyPlugin,
    Dalle3Plugin,
    TarotPlugin,
    GHPlugin,
    SystemPromptPlugin,
    TitlePlugin,
    WebSpeechPlugin,
    ElevenLabsPlugin,
];