import styled from '@emotion/styled';
import { SpotlightProvider } from '@mantine/spotlight';
import { useChatSpotlightProps } from '../spotlight';
import { LoginModal, CreateAccountModal } from './auth-modals';
import Header, { HeaderProps, SubHeader } from './header';
import MessageInput from './input';
import SettingsDrawer from './settings';
import Sidebar from './sidebar';
import AudioControls from './tts-controls';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: row;
    overflow: hidden;

    background: #292933;
    color: white;

    .sidebar {
        width: 0%;
        height: 100%;
        background: #303038;
        flex-shrink: 0;

        @media (min-width: 40em) {
            transition: width 0.2s ease-in-out;
        }

        &.opened {
            width: 33.33%;

            @media (max-width: 40em) {
                width: 100%;
                flex-shrink: 0;
            }

            @media (min-width: 50em) {
                width: 25%;
            }

            @media (min-width: 60em) {
                width: 20%;
            }
        }
    }

    @media (max-width: 40em) {
        .sidebar.opened + div {
            display: none;
        }
    }
`;

const Main = styled.div`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: scroll;

    @media (min-height: 30em) {
        overflow: hidden;
    }
`;

export interface PageProps {
    id: string;
    headerProps?: HeaderProps;
    showSubHeader?: boolean;
    children: any;
    isGallery?: boolean;
}

export function Page(props: PageProps) {
    const spotlightProps = useChatSpotlightProps();
    const navigate = useNavigate();
    const [isGallery, setIsGallery] = useState(props.isGallery || false);

    const handleToggleGallery = useCallback(() => {
        if (isGallery) {
            navigate('/');
        } else {
            navigate('/gallery');
        }
    }, [isGallery, navigate]);

    const headerProps: HeaderProps = {
        ...props.headerProps,
        isGallery,
        onToggleGallery: handleToggleGallery,
    };

    return <SpotlightProvider {...spotlightProps}>
        <Container>
            <Sidebar />
            <Main key={props.id}>
                <Header {...headerProps} />
                {props.showSubHeader && <SubHeader />}
                {props.children}
                {!isGallery && (
                    <>
                        <AudioControls />
                        <MessageInput key={localStorage.getItem('openai-api-key')} />
                        <SettingsDrawer />
                        <LoginModal />
                        <CreateAccountModal />
                    </>
                )}
            </Main>
        </Container>
    </SpotlightProvider>;
}
