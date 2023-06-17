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

    let midjournerMessage: MidjourneyMessage = { uri: "", progress:"error"} ;

    try {
        midjournerMessage = JSON.parse(props.content)

    } catch (error) {
        console.log("Failed to parse midjourney message:", props.content, "with error:", error) ;        
    }

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            <ImagePreview>
                <img src={midjournerMessage.uri} />
            </ImagePreview>
            <h6>{ midjournerMessage.progress }</h6>
            { midjournerMessage.id ? <Button
                    variant="light" 
                    style={{ marginTop: '1rem' }}
                >
                    Image id: {midjournerMessage.id}
                </Button> : null }
        </div>
    ), [midjournerMessage.uri, classes, intl]);

    return elem;
}
