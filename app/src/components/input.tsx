import styled from '@emotion/styled';
import { Button, ActionIcon, Textarea, Loader, Popover, AutocompleteItem, Switch, Radio, Tooltip, Box } from '@mantine/core';
import { getHotkeyHandler, useHotkeys, useMediaQuery } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../core/context';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMessage, setMessage, selectImageUrls, addImageUrl, removeImageUrl, clearImageList, selectAutoSubmit, setAutoSubmit, resetAutoSubmit} from '../store/message';
import { setTools, enableTool, disableTool, selectTools, selectDisabledTools, selectEnabledToolsList } from '../store/tools';
import { selectSettingsTab, openOpenAIApiKeyPanel } from '../store/settings-ui';
import { speechRecognition, supportsSpeechRecognition } from '../core/speech-recognition-types'
import { useWhisper } from '@chengsokdara/use-whisper';
import QuickSettings from './quick-settings';
import { useOption } from '../core/options/use-option';
import { TarotInput } from './tarotinput' ;
import { GHInput } from './ghinput' ;
import { countTokensForText } from '../core/tokenizer';
import { backend } from '../core/backend';
import FileUpload, { computeSHA1 } from './file-upload';
import { IconX } from '@tabler/icons-react';
import { ToolFunction } from '../core/chat/types' ;
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
    },
    {
        name: "/dalle3",
        parameters: [
            {
                name: 'Dall3',
                description: 'Creation image Dalle3'
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

    const imageUrls = useAppSelector(selectImageUrls);
    const enabledToolsList = useAppSelector(selectEnabledToolsList);

    const [recording, setRecording] = useState(false);
    const recordingRef = useRef(recording);
    const [speechInitialMessage, setSpeechInitialMessage] = useState("");
    const speechInitialMessageRef = useRef(speechInitialMessage);
    const autoSubmit = useAppSelector(selectAutoSubmit);    
    let silenceTimer: ReturnType<typeof setTimeout>;

    const [speechError, setSpeechError] = useState<string | null>(null);
    const hasVerticalSpace = useMediaQuery('(min-height: 1000px)');
    const [useOpenAIWhisper] = useOption<boolean>('speech-recognition', 'use-whisper');
    const [useFreeHands] = useOption<boolean>('speech-recognition', 'free-hands');
    const [freeHandsDelay] = useOption<number>('speech-recognition', 'free-hands-delay');
    const [openAIApiKey] = useOption<string>('openai', 'apiKey');

    const [initialMessage, setInitialMessage] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showDropdown, setShowDropDown] = useState(false);    
    const [showTarotInput, setShowTarotInput] = useState(false);    
    const [showGHInput, setShowGHInput] = useState(false);    

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
    const [showTools] = useOption<boolean>('parameters', 'showTools', context.id || undefined);

    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {

        const value = e.target.value;

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
        console.log("reset speech initial message");
        setSpeechInitialMessage("");
        console.log("onSubmit!", enabledToolsList, "message:", message);
        
        const id = await context.onNewMessage(message, imageUrls, showTools ? enabledToolsList : []);

        if (id) {
            if (!window.location.pathname.includes(id)) {
                navigate('/chat/' + id);
            }
            dispatch(setMessage(''));
            dispatch(clearImageList());
        }
    }, [context, message, imageUrls, speechInitialMessage, autoSubmit, dispatch, navigate]);

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
                    //const initialMessage = message;
                    console.log("init speech recognition with initial message:", message);
                    setSpeechInitialMessage(message);
                    speechRecognition.continuous = true;
                    speechRecognition.interimResults = true;

                    speechRecognition.onresult = (event) => {
                        let transcript = '';    
                        if (useFreeHands) {  
                            dispatch(resetAutoSubmit());
                        }
                        if ( event.resultIndex < event.results.length) {
                            for (let i = event.resultIndex; i < event.results.length; i++) {
                                if (event.results[i].isFinal && event.results[i][0].confidence) {
                                    transcript += event.results[i][0].transcript;
                                }
                            }
                            if ( transcript !== '') {
                                const current_message = speechInitialMessageRef.current + ' ' + transcript;
                                dispatch(setMessage(current_message));
                                setSpeechInitialMessage(current_message);
                                if (useFreeHands) {  
                                    dispatch(setAutoSubmit());
                                }
                                
                            }
                        }
                    };

                    speechRecognition.onaudioend= () => {
                    }

                    speechRecognition.onend = () => {
                        console.log(`speechRecognition end:  recording: ${recordingRef.current}, initMessage: ${speechInitialMessageRef.current}`);
                        if (recordingRef.current && speechRecognition) {
                            speechRecognition.start();
                        }                        
                    }
                    speechRecognition.onstart = () => {
                        console.log("speechRecognition start");
                    }                    

                    speechRecognition.start();
                } else {
                    onSpeechError(new Error('not supported'));
                }
            } else {
                if (useOpenAIWhisper || !supportsSpeechRecognition) {
                    await stopRecording();
                    setTimeout(() => setRecording(false), 500);
                } else if (speechRecognition) {
                    console.log("stop recording!");
                    speechRecognition.stop();
                    setRecording(false);
                } else {
                    onSpeechError(new Error('not supported'));
                }
            }
        } catch (e) {
            onSpeechError(e);
        }
    }, [recording, message, autoSubmit, speechInitialMessage, dispatch, onSpeechError, setInitialMessage, setSpeechInitialMessage, onSubmit, openAIApiKey]);

    const onAutoSubmit = useCallback(() => {
        console.log(`onAutoSubmit! message:${message} autoSubmit:${autoSubmit}`);
        onSubmit();
    }, [message, autoSubmit, onSubmit, onSpeechStart, dispatch])

    useEffect(() => {
        if (useOpenAIWhisper || !supportsSpeechRecognition) {
            if (!transcribing && !recording && transcript?.text) {
                dispatch(setMessage(initialMessage + ' ' + transcript.text));
            }
        }
    }, [initialMessage, transcript, recording, transcribing, useOpenAIWhisper, dispatch]);

    useEffect(() => {
        recordingRef.current = recording;
    }, [recording]);

    useEffect(() => {
        speechInitialMessageRef.current = speechInitialMessage;
    }, [speechInitialMessage]);

    useEffect(() => {
        if (!autoSubmit) {
            clearTimeout(silenceTimer);
        } else {
            silenceTimer = setTimeout(()=> {
                console.log("free hands autosubmit!", freeHandsDelay) ;
                onSubmit();

            }, freeHandsDelay);
        };
        return () => clearTimeout(silenceTimer);
    }, [autoSubmit]);

    useHotkeys([
        ['n', () => document.querySelector<HTMLTextAreaElement>('#message-input')?.focus()]
    ]);

    const blur = useCallback(() => {
        document.querySelector<HTMLTextAreaElement>('#message-input')?.blur();
    }, []);

    function getSupportedExtension(mimeType: string): string | false {
        const mapping: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
        };
      
        return mapping[mimeType] || false;
      }

    const handleFileCb = useCallback( async (file: File) => {
        try {
            
            if (! file.type.startsWith('image/') ) {
                console.log(`upload file: ${file.name} is not an image: ${file.type}`)
                return ;
            }

            if (! getSupportedExtension(file.type)){
                console.log(`upload file: ${file.name} is not a supported image type: ${file.type}`)
                return ;
            }
            // get sha1 of the file
            const sha1 = await computeSHA1(file) ;
            // Request pre-signed URL from the backend
            const response = await backend.current?.getPresignedUploadUrl(file, sha1);
            console.log("getPresignedUpload=>", response);
            const url = response.upload_url;
            const public_url: string = response.public_image_url ;
            // Upload the file directly to S3 using the pre-signed URL
            
            const uploadResponse = await backend.current?.put(url, file.type, file);
      
            dispatch(addImageUrl(public_url));
  
            console.log('File uploaded successfully', uploadResponse);
          } catch (error) {
            console.error('Error uploading file:', error);
          }
  
    }, [dispatch]);

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

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const toolsList: ToolFunction[] = await backend.current?.getTools(); // Assuming getTools returns the tools list
                dispatch(setTools(toolsList)); // Dispatch tools list to the store
            } catch (error) {
                console.error('Failed to fetch tools:', error);
            }
        };
    
        fetchTools();
    }, [dispatch]);

    const ToolsManager: React.FC = () => {
        
        const tools = useAppSelector(selectTools);


        const handleToggle = (toolName: string, isEnabled: boolean) => {
            if (isEnabled) {
                dispatch(enableTool(toolName)); // Remove from disabledTools
            } else {
                dispatch(disableTool(toolName)); // Add to disabledTools
            }
        };

        return (
            <div>
                {tools.map((tool) => (
                    <div key={tool.name}>                        
                        <Switch
                            checked={enabledToolsList.some( it => it.name === tool.name)}
                            onChange={(event) => handleToggle(tool.name, event.currentTarget.checked)}
                            label={tool.name}
                        />
                    </div>
                ))}
            </div>
        );
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

    interface RemovableImageProps {
        imageUrl: string;
        onRemove: () => void;
        index: number; // Optional, depending on your needs
      }

    const  RemovableImage: React.FC<RemovableImageProps> = ({ imageUrl, onRemove, index }) => {
        const [isHovered, setIsHovered] = useState(false);

        return (
                <Box onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={imageUrl} alt={`Uploaded ${index}`} style={{ width: '50px', height: 'auto', margin: '2px' }} />
                  {isHovered && (
                    <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Tooltip label="Remove image" withArrow position="top">
                        <ActionIcon 
                        variant="filled" 
                        color="red" 
                        onClick={onRemove}
                        >
                        <IconX size={16} />
                        </ActionIcon>
                    </Tooltip>
                    </div>
                )}
                </Box>
            );
    }

    const ImageList: React.FC<{ imageUrls: string[] }> = ({ imageUrls }) => {
        //const dispatch = useDispatch();
      
        return (
          <>
            {imageUrls.map((imageUrl, index) => (
              <RemovableImage 
                key={index} 
                imageUrl={imageUrl} 
                index={index} 
                onRemove={() => dispatch(removeImageUrl(imageUrl))}
              />
            ))}
          </>
        );
      };    

    const ToolsAndUpload = styled.div`
      opacity: 0.8;
      padding-right: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    `
    const RightAlignedUploads = styled.div`
      display: flex;
      align-items: center;
    `

    const AboveInput = useMemo(() => {
        return (
        <ToolsAndUpload>
            { showTools ? <ToolsManager /> : <div></div> }
            <RightAlignedUploads>
                <ImageList imageUrls={imageUrls}/>
                <FileUpload onFileSelected={handleFileCb} />
            </RightAlignedUploads>
        </ToolsAndUpload>
        );
    }, [showTools, enabledToolsList, imageUrls,dispatch]);

    return <Container>
        <div className="inner" style={innerStyle}>    
        {AboveInput}
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
            <TokenCount>tokens: {countTokensForText(message)}</TokenCount><QuickSettings key={tab} />
        </div>
    </Container>;
}
