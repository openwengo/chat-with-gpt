import { defaultModel } from "../core/chat/openai";
import { OptionGroup } from "../core/options/option-group";

export const parameterOptions: OptionGroup = {
    id: 'parameters',
    options: [
        {
            id: "model",
            defaultValue: defaultModel,
            resettable: true,
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
                        label: "GPT-4 O",
                        value: "gpt-4o",
                    },
                    {
                        label: "GPT-4 Turbo",
                        value: "gpt-4-turbo",
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
                        label: "Claude v3.5 sonnet",
                        value: "anthropic/claude-3.5-sonnet",
                    },
                    {
                        label: "Gemini Pro 1.5",
                        value: "google/gemini-pro-1.5",
                    },
                    {
                        label: "Claude v3 opus",
                        value: "anthropic/claude-3-opus:beta",
                    },
                    {
                        label: "Claude v3 haiku",
                        value: "anthropic/claude-3-haiku:beta",
                    },
                ],
            }),
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
            id: 'showTokens',
            defaultValue: false,
            resettable: true,
            scope: "chat",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            renderProps: {
                type: "checkbox",
                label: "View tokens",
            },
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
        {
            id: 'showToolsDebug',
            defaultValue: false,
            resettable: true,
            scope: "chat",
            displayOnSettingsScreen: "chat",
            displayAsSeparateSection: true,
            renderProps: {
                type: "checkbox",
                label: "Tools debugging",
            },
        },   

    ]
};