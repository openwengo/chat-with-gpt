import styled from '@emotion/styled';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Button, CopyButton } from '@mantine/core';
import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { MidjourneyMessage } from '../core/chat/types'  ;

const Code = styled.div`
    padding: 0;
    border-radius: 0.25rem;
    overflow: hidden;

    &>div {
        margin: 0 !important;
    }

    .fa {
        font-style: normal !important;
    }
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background: #191919;
    height: 2.5rem;
    padding: 0.1rem 0.1rem 0 0.5rem;

    .mantine-Button-label {
        display: flex;
        align-items: center;

        * {
            font-size: 90%;
        }
    }
`;

const ImagePreview = styled.div`
    text-align: center;

    img {
        max-width: 30rem !important;
        display: block;
    }
`;

const CenteredButton = styled.div`
    text-align: center;
`;


export interface MidjourneyDisplayProps {
    content: string;
    className?: string;
}

export function MidjourneyDisplay(props: MidjourneyDisplayProps) {
    const intl = useIntl();

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];
        
        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className])

    let midjourneyMessage: MidjourneyMessage = { uri: "", progress:"starting.."} ;
    
    const handleOpenImage = (imageUrl: string) => {
        window.open(imageUrl, "_blank");
    };

    if (props.content !== "") {
        try {
            midjourneyMessage = JSON.parse(props.content)

        } catch (error) {
            console.log("Failed to parse midjourney message:", props.content, "with error:", error) ;   
            midjourneyMessage.progress="error";
        }
    }

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            <ImagePreview>
                <img src={midjourneyMessage.uri} 
                     onClick={ () => handleOpenImage(midjourneyMessage.uri)}
                     style={{ cursor: "pointer" }}/>
            </ImagePreview>
            { midjourneyMessage.progress === "done" ? <><CenteredButton><Button
             variant="light"             
             onClick={() => handleOpenImage(midjourneyMessage.uri)}>
                Web
            </Button></CenteredButton>
            <div>/variations 1-4</div>
            <div>/upscale 1-4</div>
            </> : <h6>{ midjourneyMessage.progress }</h6> }
            

        </div>
    ), [midjourneyMessage.uri, classes, intl]);

    return elem;
}
