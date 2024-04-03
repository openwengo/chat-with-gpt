import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';
import { ToolFunction } from '../core/chat/types' ;
import { createSelector } from 'reselect';

interface ToolsState {
    tools: ToolFunction[];
    enabledTools: string[]; // Keep this to track enabled tools by name
}
const initialState: ToolsState = {
    tools: [],
    enabledTools: [],
};

export const toolsSlice = createSlice({
    name: 'tools',
    initialState,
    reducers: {
        setTools: (state, action: PayloadAction<ToolFunction[]>) => {
            state.tools = action.payload;
        },
        disableTool: (state, action: PayloadAction<string>) => {
            state.enabledTools = state.enabledTools.filter(toolName => toolName !== action.payload);
        },
        enableTool: (state, action: PayloadAction<string>) => {
            if (!state.enabledTools.includes(action.payload)) {                
                state.enabledTools.push(action.payload);
            }
        },
        // Optionally, add a reducer to disable all tools for completeness
        disableAllTools: (state) => {
            state.enabledTools = [];
        },        
        // And to enable all tools
        enableAllTools: (state) => {            
            state.enabledTools = state.tools.map(tool => tool.name);
        },        
    },
});

export const { setTools, enableTool, disableTool, disableAllTools, enableAllTools } = toolsSlice.actions;

export const selectTools = (state: RootState) => state.tools.tools;
export const enabledTools = (state: RootState) => state.tools.enabledTools;

// Adjusted selector for disabled tools
export const selectDisabledTools = createSelector(
    [selectTools, enabledTools],
    (selectTools, enabledTools) => {
      return selectTools.filter(tool => !enabledTools.includes(tool.name));
    }
  );


export const selectEnabledToolsList =  createSelector(
    [selectTools, enabledTools],
    (selectTools, enabledTools) => {
      return selectTools.filter(tool => enabledTools.includes(tool.name));
    }
  );

export default toolsSlice.reducer;