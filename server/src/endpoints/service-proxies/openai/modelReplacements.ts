// modelReplacements.ts
export const modelReplacements: Map<string, string> = new Map([
    // gpt-3.5-turbo models
    ["gpt-3.5-turbo-1106", "gpt-4o"],
    ["gpt-3.5-turbo-0125", "gpt-4o"],
    ["gpt-3.5-turbo", "gpt-4o"],
  
    // gpt-4 models
    ["gpt-4-0314", "gpt-4o"],
    ["gpt-4-0613", "gpt-4o"],
    ["gpt-4", "gpt-4o"],
  
    // gpt-4-turbo and preview models
    ["gpt-4-1106-preview", "chatgpt-4o-latest"],
    ["gpt-4-0125-preview", "chatgpt-4o-latest"],
    ["gpt-4-turbo-preview", "chatgpt-4o-latest"],
    ["gpt-4-turbo-2024-04-09", "chatgpt-4o-latest"],
    ["gpt-4-turbo", "chatgpt-4o-latest"],
  ]);
  