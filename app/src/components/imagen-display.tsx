import styled from '@emotion/styled';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ImagenMessage } from '../core/chat/types'  ;


const ImagePreview = styled.div`
    text-align: center;

    img {
        max-width: 30rem !important;
        display: block;
    }
`;

export interface ImagenDisplayProps {
    content: string;
    className?: string;
}

export function ImagenDisplay(props: ImagenDisplayProps) {
    const intl = useIntl();

    const classes = useMemo(() => {
        const classes = ['prose', 'dark:prose-invert'];
        
        if (props.className) {
            classes.push(props.className);
        }

        return classes;
    }, [props.className])

    let imagenMessage: ImagenMessage = { } ;
    
    const handleOpenImage = (imageUrl: string) => {
        window.open(imageUrl, "_blank");
    };

    
    console.log("ImagenDisplay props:", props) ;

    if (props.content !== "") {
        try {
            imagenMessage = JSON.parse(props.content)

        } catch (error) {
            console.log("Failed to parse imagen message:", props.content, "with error:", error) ;
        }
    }
    console.log("props.content:", props.content, "imagenMessage:", imagenMessage);

    const elem = useMemo(() => (
        <div className={classes.join(' ')}>
            {imagenMessage.response?.predictions && imagenMessage.response?.predictions.length > 0 && !imagenMessage.error &&
                <>
                    {imagenMessage.response.predictions.map((prediction, index) => (
                        <ImagePreview key={index}>
                            <img 
                                src={prediction.imageUrl} 
                                onClick={() => handleOpenImage(prediction.imageUrl || "about:blank")}
                                alt={`Generated Image ${index + 1}`}
                            />
                            {prediction.raiFilteredReason && (
                                <div>Filter reason: {prediction.raiFilteredReason}</div>
                            )}
                        </ImagePreview>
                    ))}
                </>
            }
            {imagenMessage.error &&
                <b>ERROR: {imagenMessage.error}</b>
            }
        </div>
    ), [imagenMessage.response, imagenMessage.error, classes, intl]);


    return elem;
}
