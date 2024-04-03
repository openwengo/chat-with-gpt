import { defaultModel } from "../core/chat/openai";
import { OptionGroup } from "../core/options/option-group";

export const parameterOptions: OptionGroup = {
    id: 'parameters',
    options: [
        {
            id: "model",
            defaultValue: defaultModel,
            resettable: false,
            scope: "user",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            displayInQuickSettings: {
                name: "Model",
                displayByDefault: true,
                label: (value) => value,
            },
            renderProps: (value, options, context) => ({
                type: "select",
                label: "Model",
                options: [
                    {
                        label: "GPT-4 Turbo",
                        value: "gpt-4-turbo-preview",
                    },
                    {
                        label: "GPT 3.5 1106",
                        value: "gpt-3.5-turbo-1106",
                    },
                    {
                        label: "GPT 4",
                        value: "gpt-4",
                    },
                    {
                        label: "GPT 3.5 Turbo (16k)",
                        value: "gpt-3.5-turbo-16k",
                    },
                    {
                        label: "GPT 4 (32k)",
                        value: "openai/gpt-4-32k",
                    },
                    {
                        label: "Claude v3 opus",
                        value: "anthropic/claude-3-opus:beta",
                    },
                    {
                        label: "Claude v3 sonnet",
                        value: "anthropic/claude-3-sonnet:beta",
                    },
                    {
                        label: "Claude v3 haiku",
                        value: "anthropic/claude-3-haiku:beta",
                    },
                ],
            }),
        },
        {
            id: 'wengoplus-mode',
            defaultValue: false,
            resettable: true,
            scope: "chat",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            displayInQuickSettings: {
                name: "Enable access to internet and other tools",
                displayByDefault: true,
                label: (value) => value ? "Disable wengoplus" : "Enable wengoplus",
            },
            renderProps: {
                type: "checkbox",
                label: "Enable access to internet and other tools",
            },
        },        
        {
            id: "temperature",
            defaultValue: 0.2,
            resettable: true,
            scope: "chat",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            displayInQuickSettings: {
                name: "Temperature",
                displayByDefault: true,
                label: (value) => "Temperature: " + value.toFixed(1),
            },
            renderProps: (value, options, context) => ({
                type: "slider",
                label: "Temperature: " + value.toFixed(1),
                min: 0,
                max: 1,
                step: 0.1,
                description: context.intl.formatMessage({ defaultMessage: "The temperature parameter controls the randomness of the AI's responses. Lower values will make the AI more predictable, while higher values will make it more creative." }),
            })
        },
        {
            id: 'showTools',
            defaultValue: false,
            resettable: true,
            scope: "chat",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            displayInQuickSettings: {
                name: "View tool config",
                displayByDefault: true,
                label: (value) => value ? "Hide tool selection" : "View tool selection",
            },
            renderProps: {
                type: "checkbox",
                label: "View tools",
            },
        },   
    ]
};