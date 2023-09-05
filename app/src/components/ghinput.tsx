import styled from "@emotion/styled";
import { Button, TextInput, Textarea, Select, Paper } from "@mantine/core";
import { useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useAppDispatch, useAppSelector } from "../store";
import { closeModals, openLoginModal, openSignupModal, selectModal } from "../store/ui";
import React, { useState, useRef } from 'react';

const Container = styled.form`
    * {
        font-family: "Work Sans", sans-serif;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: bold;
    }

    .mantine-TextInput-root, .mantine-PasswordInput-root {
        margin-top: 1rem;
    }
    
    .mantine-TextInput-root + .mantine-Button-root,
    .mantine-PasswordInput-root + .mantine-Button-root {
        margin-top: 1.618rem;
    }

    .mantine-Button-root {
        margin-top: 1rem;
    }

    label {
        margin-bottom: 0.25rem;
    }
`;
const signesAstro = [
    { value: '0', label: 'Bélier' },
    { value: '1', label: 'Taureau' },
    { value: '2', label: 'Gémeaux' },
    { value: '3', label: 'Cancer' },
    { value: '4', label: 'Lion' },
    { value: '5', label: 'Vierge' },
    { value: '6', label: 'Balance' },
    { value: '7', label: 'Scorpion' },
    { value: '8', label: 'Sagittaire' },
    { value: '9', label: 'Capricorne' },
    { value: '10', label: 'Verseau' },
    { value: '11', label: 'Poissons' },
];

export const signesAstroDict = signesAstro.reduce((acc, card) => {
    acc[card.value] = card.label;
    return acc;
}, {});

const slugs = [
    { value: 'grand-horoscope-2022', label: 'GH 2022' },
    { value: 'grand-horoscope-2023', label: 'GH 2023' },
    { value: 'grand-horoscope-2024', label: 'GH 2024' },
]

export function GHInput(props: any) {
    const defaultFormValues = {
        slug: "",
        userNatalSign: "",
        userRisingSign: "",
        lang: "",
        prompt: ""
    }

    const cleanedSlug = 'gh';
    let jsonText = '';

    if ( props.initialText && props.initialText.startsWith('/')) {
    
        const newlineIndex = props.initialText.indexOf("\n");
        const spaceIndex = props.initialText.indexOf(" ");

        let separatorIndex = -1;

        if ((newlineIndex === -1) && spaceIndex !== -1) {
            separatorIndex = spaceIndex;
        } else if ((spaceIndex === -1 ) && ( newlineIndex !== -1 )) {
            separatorIndex = newlineIndex;
        } else if (( spaceIndex !== -1) && (newlineIndex !== -1)) {
            separatorIndex = Math.min(newlineIndex, spaceIndex)
        }
        

        if ( separatorIndex !== -1 ) {
            //cleanedSlug = props.initialText.substring(1, separatorIndex) ;
            jsonText = props.initialText.substring(separatorIndex + 1);
            //console.log("Detect compatible input:", cleanedSlug, jsonText);
        }
    }
    
    const [nameOfSlug, setNameOfSlug] = useState(cleanedSlug);


    const [formValues, setFormValues] = useState( () => {
        let newFormValues = {...defaultFormValues}

        try {
            const parsedValues = JSON.parse(jsonText);

            for (let key in defaultFormValues) {
                if ( key in parsedValues ) {
                    newFormValues[key] = parsedValues[key];
                }
            }
        } catch (error) {
            console.log("Failed to initialise from initial text:", error, jsonText);
        }

        return newFormValues;
    });

    const handleChange = (name, value) => {
        setFormValues(prevValues => ({
            ...prevValues,
            [name]: value
        }));
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("GHInput: handleSubmit", formValues, props);
        const formattedMessage = JSON.stringify(formValues, null, 2);
        props.setMessage(`/${nameOfSlug}\n${formattedMessage}`);
    }

    return <Container>
            <div className="inner">
            <Paper style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleSubmit}>
                        <Select
                                data={slugs} 
                                name="slug" 
                                value={formValues.slug} 
                                onChange={(value) => handleChange('slug', value )}
                                placeholder="Report"
                        />
                        <Select
                            data={signesAstro} 
                            name="userNatalSign" 
                            value={formValues.userNatalSign} 
                            onChange={(value) => handleChange('userNatalSign', value )}
                            placeholder="Sun Sign"
                        />
                        <Select
                            data={signesAstro} 
                            name="userRisingSign" 
                            value={formValues.userRisingSign} 
                            onChange={(value) => handleChange('userRisingSign', value )}
                            placeholder="Rising Sign"
                        />
                        <Select 
                            data={[
                                { value: 'FR_FR', label: 'FR_FR' }, 
                                { value: 'ES_ES', label: 'ES_ES' }
                            ]} 
                            name="language"
                            value={formValues.lang}
                            onChange={(value) => handleChange('lang', value)}
                        />
                        <Textarea 
                            name="prompt" 
                            value={formValues.prompt} 
                            onChange={(event) => handleChange('prompt', event.target.value)}
                            placeholder="Enter your prompt"
                            autosize 
                            minRows={3}
                            maxRows={5}
                        />
                        <Button onClick={handleSubmit} style={{ marginTop: '10px' }}>Submit</Button>
                    </form>
                </Paper>
            </div>
        </Container>
}
