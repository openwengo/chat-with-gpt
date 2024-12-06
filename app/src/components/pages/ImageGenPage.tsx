import styled from '@emotion/styled';
import { Button, TextInput, Select, SegmentedControl, Group } from '@mantine/core';
import { useState } from 'react';
import { Page } from '../page';
import { ImagenDisplay } from '../imagen-display';
import { Dalle3Display } from '../dalle3-display';
import { MidjourneyStandaloneDisplay } from '../midjourney-standalone-display';
import { createStreamingImagenCompletion } from '../../core/chat/imagen';
import { createStreamingDalleCompletion } from '../../core/chat/dalle3';
import { createStreamingMidjourneyCompletion } from '../../core/chat/midjourney';
import { Parameters, OpenAIMessage } from '../../core/chat/types';

const Container = styled.div`
    max-width: 50rem;
    margin: 2rem auto;
    padding: 0 1rem;
`;

const InputContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
`;

const ControlsRow = styled.div`
    display: flex;
    gap: 1rem;
`;

const ImagesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

const aspectRatioOptions = [
    { value: 'SQUARE', label: 'Square' },
    { value: 'PORTRAIT', label: 'Portrait' },
    { value: 'LANDSCAPE', label: 'Landscape' }
];

const styleOptions = [
    { value: 'vivid', label: 'Vivid' },
    { value: 'natural', label: 'Natural' }
];

const qualityOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'hd', label: 'HD' }
];

type ModelType = 'imagen' | 'dalle3' | 'midjourney';

export default function ImageGenPage() {
    const [model, setModel] = useState<ModelType>('imagen');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('SQUARE');
    const [style, setStyle] = useState('vivid');
    const [quality, setQuality] = useState('standard');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleMidjourneyAction = async (command: string) => {
        setIsGenerating(true);
        try {
            // Extract parameters from the command
            const matches = command.match(/--(\w+)\s+([^\s-]+|"[^"]+")/g);
            const params: { [key: string]: string } = {};
            if (matches) {
                matches.forEach(match => {
                    const [key, value] = match.replace('--', '').split(/\s+/);
                    params[key] = value.replace(/"/g, '');
                });
            }

            const parameters: Parameters = {
                temperature: 1.0,
                model: 'gpt-4',
                midjourney: true,
                midjourneyParameters: {
                    midjourneyMethod: '/midjourneycustom',
                    id: params.id,
                    flags: parseInt(params.flags),
                    hash: params.custom?.split(':')[3] // Extract hash from custom parameter
                }
            };

            const messages: OpenAIMessage[] = [{
                role: 'user',
                content: command
            }];

            const { emitter } = await createStreamingMidjourneyCompletion(messages, parameters);

            emitter.on('data', (data) => {
                setGeneratedContent(data);
            });

            emitter.on('done', () => {
                setIsGenerating(false);
            });

            emitter.on('error', (error) => {
                console.error('Error processing Midjourney action:', error);
                setIsGenerating(false);
            });
        } catch (error) {
            console.error('Error:', error);
            setIsGenerating(false);
        }
    };

    const generateImage = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        try {
            if (model === 'imagen') {
                const parameters: Parameters = {
                    temperature: 1.0,
                    model: 'gpt-4',
                    imagen: true,
                    imagenParameters: {
                        prompt: prompt,
                        aspectRatio: aspectRatio
                    }
                };

                const { emitter } = await createStreamingImagenCompletion([], parameters);

                emitter.on('data', (data) => {
                    setGeneratedContent(data);
                });

                emitter.on('done', () => {
                    setIsGenerating(false);
                });

                emitter.on('error', (error) => {
                    console.error('Error generating image:', error);
                    setIsGenerating(false);
                });
            } else if (model === 'dalle3') {
                const parameters: Parameters = {
                    temperature: 1.0,
                    model: 'gpt-4',
                    dalle3: true,
                    dalle3Parameters: {
                        prompt: prompt,
                        format: aspectRatio.toLowerCase() as 'square' | 'portrait' | 'landscape',
                        style: style as 'vivid' | 'natural',
                        quality: quality as 'standard' | 'hd'
                    }
                };

                const { emitter } = await createStreamingDalleCompletion([], parameters);

                emitter.on('data', (data) => {
                    setGeneratedContent(data);
                });

                emitter.on('done', () => {
                    setIsGenerating(false);
                });

                emitter.on('error', (error) => {
                    console.error('Error generating image:', error);
                    setIsGenerating(false);
                });
            } else {
                const messages: OpenAIMessage[] = [{
                    role: 'user',
                    content: prompt
                }];

                const parameters: Parameters = {
                    temperature: 1.0,
                    model: 'gpt-4',
                    midjourney: true,
                    midjourneyParameters: {
                        midjourneyMethod: '/imagine'
                    }
                };

                const { emitter } = await createStreamingMidjourneyCompletion(messages, parameters);

                emitter.on('data', (data) => {
                    setGeneratedContent(data);
                });

                emitter.on('done', () => {
                    setIsGenerating(false);
                });

                emitter.on('error', (error) => {
                    console.error('Error generating image:', error);
                    setIsGenerating(false);
                });
            }
        } catch (error) {
            console.error('Error:', error);
            setIsGenerating(false);
        }
    };

    return (
        <Page id="image-gen">
            <Container>
                <InputContainer>
                    <SegmentedControl
                        value={model}
                        onChange={(value: ModelType) => {
                            setModel(value);
                            setGeneratedContent('');
                        }}
                        data={[
                            { label: 'Imagen', value: 'imagen' },
                            { label: 'DALL-E 3', value: 'dalle3' },
                            { label: 'Midjourney', value: 'midjourney' }
                        ]}
                    />
                    <TextInput
                        placeholder="Enter your image prompt..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                generateImage();
                            }
                        }}
                    />
                    <ControlsRow>
                        {model !== 'midjourney' && (
                            <Select
                                label="Aspect Ratio"
                                value={aspectRatio}
                                onChange={(value) => setAspectRatio(value || 'SQUARE')}
                                data={aspectRatioOptions}
                                style={{ flex: 1 }}
                            />
                        )}
                        {model === 'dalle3' && (
                            <>
                                <Select
                                    label="Style"
                                    value={style}
                                    onChange={(value) => setStyle(value || 'vivid')}
                                    data={styleOptions}
                                    style={{ flex: 1 }}
                                />
                                <Select
                                    label="Quality"
                                    value={quality}
                                    onChange={(value) => setQuality(value || 'standard')}
                                    data={qualityOptions}
                                    style={{ flex: 1 }}
                                />
                            </>
                        )}
                        <Button 
                            onClick={generateImage}
                            loading={isGenerating}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            Generate
                        </Button>
                    </ControlsRow>
                </InputContainer>
                <ImagesContainer>
                    {generatedContent && model === 'imagen' && (
                        <ImagenDisplay content={generatedContent} />
                    )}
                    {generatedContent && model === 'dalle3' && (
                        <Dalle3Display content={generatedContent} />
                    )}
                    {generatedContent && model === 'midjourney' && (
                        <MidjourneyStandaloneDisplay 
                            content={generatedContent} 
                            onNewAction={handleMidjourneyAction}
                        />
                    )}
                </ImagesContainer>
            </Container>
        </Page>
    );
}
