import styled from '@emotion/styled';
import { Button, ActionIcon, Textarea, Loader, Popover, AutocompleteItem, Radio } from '@mantine/core';
import { getHotkeyHandler, useHotkeys, useMediaQuery } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../core/context';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMessage, setMessage } from '../store/message';
import { selectSettingsTab, openOpenAIApiKeyPanel } from '../store/settings-ui';
import { speechRecognition, supportsSpeechRecognition } from '../core/speech-recognition-types'
import { useWhisper } from '@chengsokdara/use-whisper';
import QuickSettings from './quick-settings';
import { useOption } from '../core/options/use-option';
import { TarotInput } from './tarotinput' ;
import { GHInput } from './ghinput' ;
import { countTokensForText } from '../core/tokenizer';


interface SlashCommand {
    name: string;
    parameters: Array<{
        name: string;
        description: string;
    }>;
}

const slashCommands: SlashCommand[] = [
    {
        name: "/tarotouinon",
        parameters: [
            {
                name: 'Tarot Oui-Non',
                description: 'Tirage tarot Oui-Non'
            }
        ]
    },
    {
        name: "/imagine",
        parameters: [
            {
                name: 'Midjourney',
                description: 'Creation image Midjourney'
            }
        ]
    }
]

const Container = styled.div`
    background: #292933;
    border-top: thin solid #393933;
    padding: 1rem 1rem 0 1rem;

    .inner {
        max-width: 50rem;
        margin: auto;
        text-align: right;
    }

    .settings-button {
        margin: 0.5rem -0.4rem 0.5rem 1rem;
        font-size: 0.7rem;
        color: #999;
    }
`;

export declare type OnSubmit = (name?: string) => Promise<boolean>;

export interface MessageInputProps {
    disabled?: boolean;
}

export default function MessageInput(props: MessageInputProps) {
    const message = useAppSelector(selectMessage);
    const [recording, setRecording] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const hasVerticalSpace = useMediaQuery('(min-height: 1000px)');
    const [useOpenAIWhisper] = useOption<boolean>('speech-recognition', 'use-whisper');
    const [openAIApiKey] = useOption<string>('openai', 'apiKey');

    const [initialMessage, setInitialMessage] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showDropdown, setShowDropDown] = useState(false);    
    const [showTarotInput, setShowTarotInput] = useState(false);    
    const [showGHInput, setShowGHInput] = useState(false);    

    // useEffect(() => {
    //     if (showDropdown) {
    //         //const position = getCursorPosition(textareaRef.current);
    //         //setCursorPosition(position);
    //         console.log("showDropdown:", textareaRef);
    //     }
    // }, [showDropdown]);

    const {
        transcribing,
        transcript,
        startRecording,
        stopRecording,
    } = useWhisper({
        apiKey: openAIApiKey || ' ',
        streaming: false,
    });

    const navigate = useNavigate();
    const context = useAppContext();
    const dispatch = useAppDispatch();
    const intl = useIntl();

    const tab = useAppSelector(selectSettingsTab);

    const [showMicrophoneButton] = useOption<boolean>('speech-recognition', 'show-microphone');
    const [submitOnEnter] = useOption<boolean>('input', 'submit-on-enter');

    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {

        const value = e.target.value;
        //console.log("input onChange:", value);

        if ( false && value.startsWith('/')) {
            const matchingCommands = slashCommands
                .filter((cmd) => cmd.name.includes(value))
                .map((cmd) => cmd.name);
            setSuggestions(matchingCommands);
            setShowDropDown(true);
        } else {
            setShowDropDown(false);
            dispatch(setMessage(e.target.value));
        }

    }, [dispatch]);

    const pathname = useLocation().pathname;

    const onSubmit = useCallback(async () => {
        setSpeechError(null);

        const id = await context.onNewMessage(message);

        if (id) {
            if (!window.location.pathname.includes(id)) {
                navigate('/chat/' + id);
            }
            dispatch(setMessage(''));
        }
    }, [context, message, dispatch, navigate]);

    const onSpeechError = useCallback((e: any) => {
        console.error('speech recognition error', e);
        setSpeechError(e.message);

        try {
            speechRecognition?.stop();
        } catch (e) {
        }

        try {
            stopRecording();
        } catch (e) { }

        setRecording(false);
    }, [stopRecording]);

    const onHideSpeechError = useCallback(() => setSpeechError(null), []);

    const onSpeechStart = useCallback(async () => {
        let granted = false;
        let denied = false;

        try {
            const result = await navigator.permissions.query({ name: 'microphone' as any });
            if (result.state == 'granted') {
                granted = true;
            } else if (result.state == 'denied') {
                denied = true;
            }
        } catch (e) { }

        if (!granted && !denied) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                stream.getTracks().forEach(track => track.stop());
                granted = true;
            } catch (e) {
                denied = true;
            }
        }

        if (denied) {
            onSpeechError(new Error('speech permission was not granted'));
            return;
        }

        try {
            if (!recording) {
                setRecording(true);

                if (useOpenAIWhisper || !supportsSpeechRecognition) {
                    if (!openAIApiKey) {
                        dispatch(openOpenAIApiKeyPanel());
                        return false;
                    }
                    // recorder.start().catch(onSpeechError);
                    setInitialMessage(message);
                    await startRecording();
                } else if (speechRecognition) {
                    const initialMessage = message;

                    speechRecognition.continuous = true;
                    speechRecognition.interimResults = true;

                    speechRecognition.onresult = (event) => {
                        let transcript = '';
                        for (let i = 0; i < event.results.length; i++) {
                            if (event.results[i].isFinal && event.results[i][0].confidence) {
                                transcript += event.results[i][0].transcript;
                            }
                        }
                        dispatch(setMessage(initialMessage + ' ' + transcript));
                    };

                    speechRecognition.start();
                } else {
                    onSpeechError(new Error('not supported'));
                }
            } else {
                if (useOpenAIWhisper || !supportsSpeechRecognition) {
                    await stopRecording();
                    setTimeout(() => setRecording(false), 500);
                } else if (speechRecognition) {
                    speechRecognition.stop();
                    setRecording(false);
                } else {
                    onSpeechError(new Error('not supported'));
                }
            }
        } catch (e) {
            onSpeechError(e);
        }
    }, [recording, message, dispatch, onSpeechError, setInitialMessage, openAIApiKey]);

    useEffect(() => {
        if (useOpenAIWhisper || !supportsSpeechRecognition) {
            if (!transcribing && !recording && transcript?.text) {
                dispatch(setMessage(initialMessage + ' ' + transcript.text));
            }
        }
    }, [initialMessage, transcript, recording, transcribing, useOpenAIWhisper, dispatch]);

    useHotkeys([
        ['n', () => document.querySelector<HTMLTextAreaElement>('#message-input')?.focus()]
    ]);

    const blur = useCallback(() => {
        document.querySelector<HTMLTextAreaElement>('#message-input')?.blur();
    }, []);

    const rightSection = useMemo(() => {
        return (
            <div style={{
                opacity: '0.8',
                paddingRight: '0.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
            }}>
                {context.generating && (<>
                    <Button variant="subtle" size="xs" compact onClick={() => {
                        context.chat.cancelReply(context.currentChat.chat?.id, context.currentChat.leaf!.id);
                    }}>
                        <FormattedMessage defaultMessage={"Cancel"} description="Label for the button that can be clicked while the AI is generating a response to cancel generation" />
                    </Button>
                    <Loader size="xs" style={{ padding: '0 0.8rem 0 0.5rem' }} />
                </>)}
                {!context.generating && (
                    <>
                        {showMicrophoneButton && <Popover width={200} position="bottom" withArrow shadow="md" opened={speechError !== null}>
                            <Popover.Target>
                                <ActionIcon size="xl"
                                    onClick={onSpeechStart}>
                                    {transcribing && <Loader size="xs" />}
                                    {!transcribing && <i className="fa fa-microphone" style={{ fontSize: '90%', color: recording ? 'red' : 'inherit' }} />}
                                </ActionIcon>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                }}>
                                    <p style={{
                                        fontFamily: `"Work Sans", sans-serif`,
                                        fontSize: '0.9rem',
                                        textAlign: 'center',
                                        marginBottom: '0.5rem',
                                    }}>
                                        Sorry, an error occured trying to record audio.
                                    </p>
                                    <Button variant="light" size="xs" fullWidth onClick={onHideSpeechError}>
                                        Close
                                    </Button>
                                </div>
                            </Popover.Dropdown>
                        </Popover>}
                        <ActionIcon size="xl"
                            onClick={onSubmit}>
                            <i className="fa fa-paper-plane" style={{ fontSize: '90%' }} />
                        </ActionIcon>
                    </>
                )}
            </div>
        );
    }, [recording, transcribing, onSubmit, onSpeechStart, props.disabled, context.generating, speechError, onHideSpeechError, showMicrophoneButton]);

    const disabled = context.generating;

    const isLandingPage = pathname === '/';
    if (context.isShare || (!isLandingPage && !context.id)) {
        return null;
    }

    const hotkeyHandler = useMemo(() => {
        const keys = [
            ['Escape', blur, { preventDefault: true }],
            ['ctrl+Enter', onSubmit, { preventDefault: true }],

        ];
        if (submitOnEnter) {
            keys.unshift(['Enter', onSubmit, { preventDefault: true }]);
        }
        const handler = getHotkeyHandler(keys as any);
        return handler;
    }, [onSubmit, blur, submitOnEnter]);

    const DropdownDiv = styled.div`
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        background-color: #333;
        border: 1px solid #ccc;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    `

    const SuggestionItem = styled.div`
        padding: 8px 12px;
        cursor: pointer;
        text-align: left;

        &:hover {
            background-color: #555555;
        }
    `

    const TokenCount = styled.div`
        color: #ccc;
        font-size: 0.8rem;
        font-weight: 400;
        display: flex;
        align-items: center;
    `
    const innerStyle: React.CSSProperties = {
        position: 'relative'
    };

    const renderDropdown = () => {
        if (!showDropdown || !suggestions.length) return null ;
        return (
            <DropdownDiv>
                {suggestions.map( suggestion => (
                    <SuggestionItem
                        key={suggestion}
                        onClick={ () => {
                            dispatch(setMessage(suggestion));
                            //setMessage(suggestion);
                            setShowDropDown(false);
                        }}
                    >
                        {suggestion}
                    </SuggestionItem>
                ))}
            </DropdownDiv>
        );
    };

    const renderModeChoice = () => {
        if ( showGHInput || showTarotInput ) return null ;
        return (
            <Radio.Group 
                label=""
                value="Normal"
                onChange={ (value) => { if ( value == 'Tarot') { setShowTarotInput(true)}; if ( value == 'GH') { setShowGHInput(true)} }}
                spacing={1}
                size="xs"
                color="blue"
                >
                    <Radio value="Normal" label="Normal" />
                    <Radio value="Tarot" label="Tarot" />
                    <Radio value="GH" label="GH" />
                </Radio.Group>
        )
    }
    const setInputFromTarot = (message) => {
        console.log("setInputFromTarot:", message);
        setShowTarotInput(false);
        dispatch(setMessage(message))
    };

    const setInputFromGH = (message) => {
        console.log("setInputFromGH:", message);
        setShowGHInput(false);
        dispatch(setMessage(message))
    };

    return <Container>
        <div className="inner" style={innerStyle}>
            { (showTarotInput || showGHInput) || true ? null : 
            <div style={{ marginBottom: '5px' }}>
                    { renderModeChoice() }
            </div>
            }
            { showTarotInput && false ? <TarotInput setMessage={setInputFromTarot} initialText={message}/> : 
              showGHInput && false ? <GHInput setMessage={setInputFromGH} initialText={message}/> :
            <Textarea disabled={props.disabled || disabled}
                id="message-input"
                autosize
                minRows={(hasVerticalSpace || context.isHome) ? 3 : 2}
                maxRows={12}
                placeholder={intl.formatMessage({ defaultMessage: "Enter a message here..." })}
                value={message}
                onChange={onChange}
                rightSection={rightSection}
                rightSectionWidth={context.generating ? 100 : 55}
                onKeyDown={hotkeyHandler} /> 
            }
            <TokenCount>tokens: {countTokensForText(message)}</TokenCount><QuickSettings key={tab} />
        </div>
    </Container>;
}
