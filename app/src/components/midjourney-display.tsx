import styled from '@emotion/styled';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Button, CopyButton, Col, Grid, Tooltip } from '@mantine/core';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { MidjourneyMessage, MidjourneyMessageOption } from '../core/chat/types'  ;
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

interface ButtonListProps {
  options: MidjourneyMessageOption[];
  id?: string;
  flags?: number;
}

const ButtonList: React.FC<ButtonListProps> = ({ options, id, flags }) => {

  const [buttonClicked, setButtonClicked] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const dispatch = useAppDispatch();
  const context = useAppContext();
  const message = useAppSelector(selectMessage);
  const navigate = useNavigate();
  

  const onSubmit = useCallback(async () => {

      const messageId = await context.onNewMessage(message);

      console.log(`id for message=${message}`, messageId);
      if (messageId) {
          if (!window.location.pathname.includes(messageId)) {
              navigate('/chat/' + messageId);
          }
          dispatch(setMessage(''));
      }
  }, [context, message, dispatch, navigate]);


  useEffect(() => {
    if (( message !== '' ) && buttonClicked && (!messageSent)) {            
        setMessageSent(true);
        onSubmit();
    }
  }, [message, buttonClicked]);

  const renderButtons = () => {
    let items: any[] = [];
    
    options.forEach((option, index) => {
      if (option.custom.startsWith("MJ::JOB::") || option.custom.startsWith("MJ::Outpaint")) {
        const splitJobName = option.custom.split(":");

        items.push(
          <Grid.Col span="auto" order={index} key={index}>
            <Tooltip label={splitJobName[4]}>
                <Button onClick={ async () => { dispatch(setMessage(`/midjourneycustom --id ${id} --flags ${flags} --custom ${option.custom}`)); setButtonClicked(true) }}>
                {option.label}
                </Button>
            </Tooltip>
          </Grid.Col>
        );
      }

    });

    return items;
  };

  return <><Grid grow gutter="sm">{renderButtons()}</Grid></>;
};


export interface MidjourneyDisplayProps {
    content: string;
    className?: string;
}

export function MidjourneyDisplay(props: MidjourneyDisplayProps) {
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

    let midjourneyMessage: MidjourneyMessage = { uri: "", progress:"starting.."} ;
    
    const handleOpenImage = (imageUrl: string) => {
        window.open(imageUrl, "_blank");
    };

    
    //console.log("MidjourneyDisplay props:", props) ;

    if (props.content !== "") {
        try {
            midjourneyMessage = JSON.parse(props.content)

        } catch (error) {
            console.log("Failed to parse midjourney message:", props.content, "with error:", error) ;   
            midjourneyMessage.progress="error";
        }
    }
    //console.log("props.content:", props.content, "midjourneyMessage:", midjourneyMessage);

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            { ( ( midjourneyMessage.uri !== "" ) && ( midjourneyMessage.uri !== "about:blank" )) &&
            <ImagePreview>
                <img src={midjourneyMessage.uri} 
                     onClick={ () => handleOpenImage(midjourneyMessage.uri)}
                     style={{ cursor: "pointer" }}/>
            </ImagePreview>
            }
            <MaxWidth>
                { midjourneyMessage.progress === "done" ? <><CenteredButton><Button
                variant="light"             
                onClick={() => handleOpenImage(midjourneyMessage.uri)}>
                    Web
                </Button></CenteredButton>
                { midjourneyMessage.options ? <ButtonList options={midjourneyMessage.options} id={midjourneyMessage.id} flags={midjourneyMessage.flags}/> : null }
                </> : <h6>{ midjourneyMessage.progress }</h6> }
            </MaxWidth>
            

        </div>
    ), [midjourneyMessage.progress, midjourneyMessage.uri, classes, intl]);

    return elem;
}
