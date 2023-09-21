import styled from '@emotion/styled';
import { Button, CopyButton } from '@mantine/core';
import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import React from 'react';
import { Paper, Text, Container, Title, Grid, Col } from '@mantine/core';
import { tarotCardDict } from './tarotinput';

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
interface TarotData {
    [key: string]: string;
}

interface TarotTextsProps {
    jsonData: TarotData;
}

const TarotTexts: React.FC<TarotTextsProps> = ({ jsonData }) => {

    const renderXLHTMLKeys = () => {
        const textValues = jsonData.values;
        if (textValues) {
            console.log("render keys:",Object.keys(textValues));
            // Object.keys(textValues).filter((key) => key.startsWith('XLHTML'))
            return  [   {'index': 1, 'key': 'XLHTMLDescriptionCard_1_YN'},
                {'index': 2, 'key': 'XLHTMLDescriptionSumarize_1_YN'},
                {'index': 3, 'key': 'XLHTMLDescriptionCard_2_YN'},
                {'index': 4, 'key': 'XLHTMLDescriptionSumarize_2_YN'},                
                {'index': 5, 'key': 'XLHTMLDescriptionCard_3_YN'},
                {'index': 6, 'key': 'XLHTMLDescriptionSumarize_3_YN'},                
                {'index': 7, 'key': 'XLHTMLConclusionCard_YN'},
            ]
            .map(({key, index: objIndex}, arrayIndex)=> (
                <Paper key={arrayIndex}
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
    return <div>{renderXLHTMLKeys()}{renderError()}</div>
}

const TarotCards: React.FC<TarotTextsProps> = ({ jsonData }) => {

    const renderTarotCards = () => {
        const textValues = jsonData.values;
        if (textValues) {
            console.log("render keys:",Object.keys(textValues));
            const listCols =  Object.keys(textValues).filter((key) => key.startsWith('realcard'))
            .map((key, index) => (
                <Col span={4}>
                    <Text size="xs" color="dimmed" align="center">
                        {tarotCardDict[textValues[key]]}
                    </Text>
                </Col>
            ));
            return <Grid gutter="xs" justify="center">{listCols}</Grid>
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
    return <div>{renderTarotCards()}{renderError()}</div>
}

const TarotScore: React.FC<TarotTextsProps> = ({ jsonData }) => {

    const renderTarotScore = () => {
        if ('score' in jsonData) {
            return <Grid gutter="xs" justify="center">
                        <Col span={4}>
                            <Text size="xs" color="dimmed" align="center">
                                Score: {jsonData['score']}%
                            </Text>
                        </Col> 
                    </Grid>;

        } else {
            return <></>;
        }
 
    }
    return <div>{renderTarotScore()}</div>;
}

export interface TarotDisplayProps {
    content: string;
    className?: string;
}

export function TarotDisplay(props: TarotDisplayProps) {
    const intl = useIntl();

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];

        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className])

    let tarotData: TarotData = {} ;

    //console.log("Tarot props.content:", props.content);
    if (props.content !== "") {        
        try  {
            tarotData = JSON.parse(props.content);
        } catch (error) {
            console.log("Failed to parse TarotData:", error, props.content);
            tarotData = { 'errorMsg': 'failed to parse data'}

        }
    }
    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            <TarotCards jsonData={tarotData}/>
            <MaxWidth>                
                <TarotTexts jsonData={tarotData}/>
            </MaxWidth>
            <TarotScore jsonData={tarotData}/>
        </div>
    ), [props.content, classes, intl]);

    return elem;
}
