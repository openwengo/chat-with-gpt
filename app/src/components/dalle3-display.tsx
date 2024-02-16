import styled from '@emotion/styled';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Button, CopyButton, Col, Grid, Tooltip } from '@mantine/core';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Dalle3Message } from '../core/chat/types'  ;
import { useAppDispatch, useAppSelector } from '../store';
import { selectMessage, setMessage } from '../store/message';
import { useAppContext } from '../core/context';
import { useLocation, useNavigate } from 'react-router-dom';

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

const MaxWidth = styled.div`
    justify-content: center;
    align-items: center;
    flex-direction: column;
    display: flex;
    max-width: 30rem !important;
    margin: auto;
`

export interface Dalle3DisplayProps {
    content: string;
    className?: string;
}

export function Dalle3Display(props: Dalle3DisplayProps) {
    const intl = useIntl();
    const dispatch = useAppDispatch();
    const context = useAppContext();
    const message = useAppSelector(selectMessage);
    const navigate = useNavigate();

    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setMessage(e.target.value));
    }, [dispatch]);

    const onSubmit = useCallback(async () => {

        const id = await context.onNewMessage(message);

        console.log("id for message=", id);
        if (id) {
            if (!window.location.pathname.includes(id)) {
                navigate('/chat/' + id);
            }
            dispatch(setMessage(''));
        }
    }, [context, message, dispatch, navigate]);

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];
        
        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className])

    let dalle3Message: Dalle3Message = { } ;
    
    const handleOpenImage = (imageUrl: string) => {
        window.open(imageUrl, "_blank");
    };

    
    //console.log("Dalle3Display props:", props) ;

    if (props.content !== "") {
        try {
            dalle3Message = JSON.parse(props.content)

        } catch (error) {
            console.log("Failed to parse dalle3 message:", props.content, "with error:", error) ;               
        }
    }
    //console.log("props.content:", props.content, "dalle3Message:", dalle3Message);

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            { dalle3Message.images && dalle3Message.images.created > 0 && !dalle3Message.error &&
            <>
            <ImagePreview>
                <img src={dalle3Message.images.data[0].url} 
                     onClick={ () => handleOpenImage(dalle3Message.images?.data[0].url || "about:blank")}
                     style={{ cursor: "pointer" }}/>
            </ImagePreview>
            <div>Revised prompt:{dalle3Message.images.data[0].revised_prompt}</div>
            </>
            }            
            { dalle3Message.error &&
            <b>ERROR: {dalle3Message.error}</b>
            }
        </div>
    ), [dalle3Message.images, classes, intl]);

    return elem;
}
