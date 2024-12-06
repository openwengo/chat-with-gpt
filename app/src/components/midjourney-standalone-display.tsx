import styled from '@emotion/styled';
import { Button, Paper, Grid, Tooltip } from '@mantine/core';
import { useCallback, useMemo, useState } from 'react';
import { MidjourneyMessage, MidjourneyMessageOption } from '../core/chat/types';
import { createStreamingMidjourneyCompletion } from '../core/chat/midjourney';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

const ImagePreview = styled.div`
    text-align: center;

    img {
        max-width: 30rem !important;
        display: block;
    }
`;

const MaxWidth = styled.div`
    justify-content: center;
    align-items: center;
    flex-direction: column;
    display: flex;
    max-width: 30rem !important;
    margin: auto;
`;

interface ButtonListProps {
    options: MidjourneyMessageOption[];
    id?: string;
    flags?: number;
    onAction: (content: string) => void;
}

const ButtonList: React.FC<ButtonListProps> = ({ options, id, flags, onAction }) => {
    const renderButtons = () => {
        let items: any[] = [];
        
        options.forEach((option, index) => {
            if (option.custom.startsWith("MJ::JOB::") || option.custom.startsWith("MJ::Outpaint")) {
                const splitJobName = option.custom.split(":");
                
                items.push(
                    <Grid.Col span="auto" order={index} key={index}>
                        <Tooltip label={splitJobName[4]}>
                            <Button onClick={() => {
                                const command = `/midjourneycustom --id ${id} --flags ${flags} --custom ${option.custom}`;
                                onAction(command);
                            }}>
                                {option.label}
                            </Button>
                        </Tooltip>
                    </Grid.Col>
                );
            }
        });

        return items;
    };

    return <Grid grow gutter="sm">{renderButtons()}</Grid>;
};

export interface MidjourneyStandaloneDisplayProps {
    content: string;
    className?: string;
    onNewAction?: (content: string) => void;
}

export function MidjourneyStandaloneDisplay(props: MidjourneyStandaloneDisplayProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];
        
        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className]);

    let midjourneyMessage: MidjourneyMessage = { uri: "", progress: "starting.." };
    
    const handleOpenImage = (imageUrl: string) => {
        window.open(imageUrl, "_blank");
    };

    const handleAction = async (command: string) => {
        if (!props.onNewAction) return;
        
        setIsProcessing(true);
        props.onNewAction(command);
        setIsProcessing(false);
    };

    if (props.content !== "") {
        try {
            midjourneyMessage = JSON.parse(props.content);
        } catch (error) {
            console.log("Failed to parse midjourney message:", props.content, "with error:", error);
            midjourneyMessage.progress = "error";
        }
    }

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            {((midjourneyMessage.uri !== "") && (midjourneyMessage.uri !== "about:blank")) && (
                <ImagePreview>
                    <img 
                        src={midjourneyMessage.uri}
                        onClick={() => handleOpenImage(midjourneyMessage.uri)}
                        style={{ cursor: "pointer" }}
                    />
                </ImagePreview>
            )}
            {midjourneyMessage.descriptions && (
                <>
                    {midjourneyMessage.descriptions.map((desc, index) => (
                        <Paper key={index} shadow="xs" p="md" withBorder>
                            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{desc}</ReactMarkdown>
                        </Paper>
                    ))}
                </>
            )}
            <MaxWidth>
                {midjourneyMessage.progress === "done" ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <Button
                                variant="light"
                                onClick={() => handleOpenImage(midjourneyMessage.uri)}
                            >
                                Open in Browser
                            </Button>
                        </div>
                        {midjourneyMessage.options && (
                            <ButtonList 
                                options={midjourneyMessage.options}
                                id={midjourneyMessage.id}
                                flags={midjourneyMessage.flags}
                                onAction={handleAction}
                            />
                        )}
                    </>
                ) : (
                    <h6>{midjourneyMessage.progress}</h6>
                )}
            </MaxWidth>
        </div>
    ), [midjourneyMessage, classes, isProcessing]);

    return elem;
}
