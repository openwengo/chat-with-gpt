import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';

interface MessageState {
    message: string;
    imageUrls: string[];
    autoSubmit: boolean;
}

const initialState: MessageState = {
    message: '',
    imageUrls: [],
    autoSubmit: false,
};

export const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {
        setMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload;
        },
        addImageUrl: (state, action: PayloadAction<string>) => {
            const img_length = state.imageUrls.push(action.payload);
        },
        removeImageUrl: (state, action: PayloadAction<string>) => {
            state.imageUrls = state.imageUrls.filter(url => url !== action.payload);
        },
        clearImageList: (state) => {
            state.imageUrls = [];
        },
        setAutoSubmit: (state) => {
            state.autoSubmit = true;
        },
        resetAutoSubmit: (state) => {
            state.autoSubmit = false;
        }
    },
});

export const { setMessage, addImageUrl, removeImageUrl, clearImageList, setAutoSubmit, resetAutoSubmit } = messageSlice.actions;

export const selectMessage = (state: RootState) => state.message.message;
export const selectImageUrls = (state: RootState) => state.message.imageUrls;
export const selectAutoSubmit = (state: RootState) => state.message.autoSubmit;

export default messageSlice.reducer;
