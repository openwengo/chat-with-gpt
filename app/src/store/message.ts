import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';
import { ToolFunction } from '../core/chat/types' ;

interface MessageState {
    message: string;
    imageUrls: string[];
    enabledTools: string[];
}

const initialState: MessageState = {
    message: '',
    imageUrls: [],
    enabledTools: []
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
        enableTool: (state, action: PayloadAction<string>) => {
            if (!state.enabledTools.includes(action.payload)) {
                state.enabledTools.push(action.payload);
            }
        },
        disableTool: (state, action: PayloadAction<string>) => {
            state.enabledTools = state.enabledTools.filter(toolName => toolName !== action.payload);
        },        
    },
});

export const { setMessage, addImageUrl, removeImageUrl, clearImageList, enableTool, disableTool } = messageSlice.actions;

export const selectMessage = (state: RootState) => state.message.message;
export const selectImageUrls = (state: RootState) => state.message.imageUrls;
export const selectEnabledTools = (state: RootState) => state.message.enabledTools;

export default messageSlice.reducer;
