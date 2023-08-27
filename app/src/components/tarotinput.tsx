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
const tarotCards = [
    { value: '1', label: 'Le Bateleur (The Magician)' },
    { value: '2', label: 'La Papesse (The High Priestess)' },
    { value: '3', label: 'L\'Impératrice (The Empress)' },
    { value: '4', label: 'L\'Empereur (The Emperor)' },
    { value: '5', label: 'Le Pape (The Hierophant)' },
    { value: '6', label: 'L\'Amoureux (The Lovers)' },
    { value: '7', label: 'Le Chariot (The Chariot)' },
    { value: '8', label: 'La Justice (Justice)' },
    { value: '9', label: 'L\'Ermite (The Hermit)' },
    { value: '10', label: 'La Roue de Fortune (Wheel of Fortune)' },
    { value: '11', label: 'La Force (Strength)' },
    { value: '12', label: 'Le Pendu (The Hanged Man)' },
    { value: '13', label: 'La Mort (Death)' },
    { value: '14', label: 'Tempérance (Temperance)' },
    { value: '15', label: 'Le Diable (The Devil)' },
    { value: '16', label: 'La Tour (The Tower)' },
    { value: '17', label: 'L\'Étoile (The Star)' },
    { value: '18', label: 'La Lune (The Moon)' },
    { value: '19', label: 'Le Soleil (The Sun)' },
    { value: '20', label: 'Le Jugement (Judgment)' },
    { value: '21', label: 'Le Monde (The World)' },
    { value: '22', label: 'Le Mat (The Fool)' },  
];

export const tarotCardDict = tarotCards.reduce((acc, card) => {
    acc[card.value] = card.label;
    return acc;
}, {});

export function TarotInput(props: any) {
    const defaultFormValues = {
        card1: "",
        card2: "",
        card3: "",
        lang: "",
        prompt: ""
    }

    let cleanedGameName = 'tarotouinon';
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
            cleanedGameName = props.initialText.substring(1, separatorIndex) ;
            jsonText = props.initialText.substring(separatorIndex + 1);
            console.log("Detect compatible input:", cleanedGameName, jsonText);
        }
    }
    
    const [nameOfGame, setNameOfGame] = useState(cleanedGameName);


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
        console.log("TarotInput: handleSubmit", formValues, props);
        const formattedMessage = JSON.stringify(formValues, null, 2);
        props.setMessage(`/${nameOfGame}\n${formattedMessage}`);
    }

    return <Container>
            <div className="inner">
            <Paper style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleSubmit}>
                        <Select
                            data={tarotCards} 
                            name="card1" 
                            value={formValues.card1} 
                            onChange={(value) => handleChange('card1', value )}
                            placeholder="Enter card1"
                        />
                        <Select
                            data={tarotCards} 
                            name="card2" 
                            value={formValues.card2} 
                            onChange={(value) => handleChange('card2', value )}
                            placeholder="Enter card2"
                        />
                        <Select
                            data={tarotCards} 
                            name="card3" 
                            value={formValues.card3} 
                            onChange={(value) => handleChange('card3', value )}
                            placeholder="Enter card3"
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
