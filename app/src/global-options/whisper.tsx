import { OptionGroup } from "../core/options/option-group";
import { supportsSpeechRecognition } from "../core/speech-recognition-types";

export const whisperOptions: OptionGroup = {
    id: 'speech-recognition',
    name: "Microphone",
    hidden: !supportsSpeechRecognition,
    options: [
        {
            id: 'use-whisper',
            defaultValue: false,
            displayOnSettingsScreen: "speech",
            displayAsSeparateSection: false,
            renderProps: {
                type: "checkbox",
                label: "Use the OpenAI Whisper API for speech recognition",
                hidden: !supportsSpeechRecognition,
            },
        },
        {
            id: 'show-microphone',
            defaultValue: true,
            displayOnSettingsScreen: "speech",
            displayAsSeparateSection: false,
            renderProps: {
                type: "checkbox",
                label: "Show microphone in message input",
            },
        },
        {
            id: 'free-hands',
            defaultValue: false,
            displayOnSettingsScreen: "speech",
            displayAsSeparateSection: false,
            renderProps: {
                type: "checkbox",
                label: "Auto submit recorded prompt",
            },
        },
        {
            id: 'free-hands-delay',
            defaultValue: 3000,
            displayOnSettingsScreen: "speech",
            displayAsSeparateSection: false,
            renderProps: (value, options, context) => ({
                type: "slider",
                label: "Auto-submit delay: " + value.toFixed(1),
                min: 500,
                max: 5000,
                step: 100,
                description: context.intl.formatMessage({ defaultMessage: "Delay in millisecond of silence after which the recorded text is submitted" }),
            })
        },
    ],
}