import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';
import { ToolFunction } from '../core/chat/types' ;
import { createSelector } from 'reselect';

interface ToolsState {
    tools: ToolFunction[];
    disabledTools: string[]; // Keep this to track enabled tools by name
}
const initialState: ToolsState = {
    tools: [],
    disabledTools: [],
};

export const toolsSlice = createSlice({
    name: 'tools',
    initialState,
    reducers: {
        setTools: (state, action: PayloadAction<ToolFunction[]>) => {
            state.tools = action.payload;
        },
        disableTool: (state, action: PayloadAction<string>) => {
            if (!state.disabledTools.includes(action.payload)) {
                state.disabledTools.push(action.payload);
            }
        },
        enableTool: (state, action: PayloadAction<string>) => {
            state.disabledTools = state.disabledTools.filter(toolName => toolName !== action.payload);
        },
        // Optionally, add a reducer to disable all tools for completeness
        disableAllTools: (state) => {
            state.disabledTools = state.tools.map(tool => tool.name);
        },        
        // And to enable all tools
        enableAllTools: (state) => {
            state.disabledTools = [];
        },        
    },
});

export const { setTools, enableTool, disableTool, disableAllTools, enableAllTools } = toolsSlice.actions;

export const selectTools = (state: RootState) => state.tools.tools;
// Adjusted selector for disabled tools
export const selectDisabledTools = (state: RootState) => state.tools.disabledTools;

export const selectEnabledToolsList = createSelector(
    [selectTools, selectDisabledTools],
    (selectTools, disabledTools) => {
      return selectTools.filter(tool => !disabledTools.includes(tool.name));
    }
  );

export default toolsSlice.reducer;