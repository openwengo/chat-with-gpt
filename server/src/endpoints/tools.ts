import express from 'express';
import RequestHandler from "./base";
import { config } from '../config';

export interface ToolParameter {
    description: string;
    type: string;
  }

export interface ToolParameters {
    type: string; // "object"
    properties: {
        [key: string]: ToolParameter ;
    };
    required: string[];
}

export interface ToolFunction {
    description: string;
    name: string;
    parameters: ToolParameters
}

const tools : ToolFunction[] =[
    { 
        'description': 'This tool manages all interactions with Graam ( aka Wephone ) which is a Callcenter application. You can ask it for any information about Graam\'s database',
        'name': 'graam-tool',
        'parameters': {
            "type": "object",
            "properties" : {
                "question" : {
                    'description': "The question to ask about Graam ( aka Wephone ) 's database",
                    'type': 'string'
                }
            },
            "required": ["question"]
        }
    }
]

export default class ToolsDatabaseRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const loggedUser = (req as any).session?.passport?.user?.id;
        res.json(tools)
    }
    
    public isProtected() {
        return true;
    }

}
