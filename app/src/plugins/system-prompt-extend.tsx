import { FormattedMessage } from "react-intl";
import Plugin from "../core/plugins";
import { PluginDescription } from "../core/plugins/plugin-description";
import { OpenAIMessage, Parameters } from "../core/chat/types";

export const chartJsPrompt = `
You can draw radar graphs in markdown with this syntax: 
\`\`\`radar 
{"data": ..., "options": ... }
\`\`\`
Where data and options are chart.js ones for the Radar object.
Youcan use options.scales.r.suggestedMin and options.scales.r.suggestedMax to configure min and max values on the scale
`.trim();

export interface SystemPromptExtendedluginOptions {
    systemPrompt: string;
}

export class ExtendedSystemPromptPlugin extends Plugin<SystemPromptExtendedluginOptions> {
    describe(): PluginDescription {
        return {
            id: "extended-system-prompt",
            name: "Extended System Prompt",
            options: [
                {
                    id: "extendedSystemPrompt",
                    defaultValue: '' + chartJsPrompt,
                    displayOnSettingsScreen: "chat",
                    resettable: true,
                    scope: "chat",
                    renderProps: {
                        type: "textarea",
                        description: <p>
                            <FormattedMessage defaultMessage={"Extra instructions appended after the system prompt."}
                                values={{ code: v => <code>{v}</code> }} />
                        </p>,
                    },
                    displayInQuickSettings: {
                        name: "Extended System Prompt",
                        displayByDefault: false,
                        label: "Customize extended system prompt",
                    },
                },
            ],
        };
    }

    async preprocessModelInput(messages: OpenAIMessage[], parameters: Parameters): Promise<{ messages: OpenAIMessage[]; parameters: Parameters; }> {

        const modifiedMessages = messages.map(message => {
            if (message.role === 'system') {
                return {
                    ...message,
                    content: message.content + "\n" + chartJsPrompt
                };
            }
            return message;
        });

        return {
            messages: modifiedMessages,
            parameters,
        };
    }
}