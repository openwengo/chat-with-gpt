import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';

interface MessageState {
    message: string;
    imageUrls: string[];
}

const initialState: MessageState = {
    message: '',
    imageUrls: [],
};

export const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {
        setMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload;
        },
        addImageUrl: (state, action: PayloadAction<string>) => {
            console.log("add image url:", action.payload, "image urls:", state.imageUrls);
            const img_length = state.imageUrls.push(action.payload);
            console.log("after add image url:", img_length, state.imageUrls, state.imageUrls[0],state.imageUrls[img_length-1]);
        },
        removeImageUrl: (state, action: PayloadAction<string>) => {
            state.imageUrls = state.imageUrls.filter(url => url !== action.payload);
        },
        clearImageList: (state) => {
            state.imageUrls = [];
        },
    },
});

export const { setMessage, addImageUrl, removeImageUrl, clearImageList } = messageSlice.actions;

export const selectMessage = (state: RootState) => state.message.message;
export const selectImageUrls = (state: RootState) => state.message.imageUrls;

export default messageSlice.reducer;
