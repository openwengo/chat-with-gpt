import styled from '@emotion/styled';
import { Button, CopyButton } from '@mantine/core';
import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import React from 'react';
import { Paper, Text, Container, Title, Grid, Col } from '@mantine/core';
import { signesAstroDict } from './ghinput';

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

const MaxWidth = styled.div`
    justify-content: center;
    align-items: center;
    flex-direcation: column;
    display: flex;
    max-width: 30rem !important;
    margin: auto;
`
interface GHData {
    [key: string]: string;
}

interface GHTextsProps {
    jsonData: GHData;
}

function htmlEncode(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

const GHTexts: React.FC<GHTextsProps> = ({ jsonData }) => {

    const renderGHKeys = () => {
        const textValues = jsonData.values;
        if (textValues) {
            //console.log("render keys:",Object.keys(textValues));
            return Object.keys(textValues).filter((key) => key.startsWith('GH20'))
            .map((key, index) => (
                <Paper key={index}
                style={{ overflowY: 'auto', maxHeight: '200px', marginBottom: '10px' }}>
                    <Container>
                        <Title order={5}>{key}</Title>
                        <Text size="xs" color="dimmed">
                            {textValues[key]}
                        </Text>
                    </Container>
                </Paper>
            ));
        } else {
            return <div>No texts yet..</div>
        }
    };

    const renderError = () => {
        if (jsonData.errorMsg) {
            return <><b>{jsonData.errorMsg}</b></>
        } else {
            return <></>;
        }
    }
    return <div>{renderGHKeys()}{renderError()}</div>
}


export interface GHDisplayProps {
    content: string;
    className?: string;
}

export function GHDisplay(props: GHDisplayProps) {
    const intl = useIntl();

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];

        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className])

    let ghData: GHData = {} ;

    //console.log("GH props.content:", props.content);
    if (props.content !== "") {        
        try  {
            ghData = JSON.parse(props.content);
        } catch (error) {
            console.log("Failed to parse GHData:", error, props.content);
            ghData = { 'errorMsg': 'failed to parse data'}

        }
    }
    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            <MaxWidth>                
                <GHTexts jsonData={ghData}/>
            </MaxWidth>
        </div>
    ), [props.content, classes, intl]);

    return elem;
}
