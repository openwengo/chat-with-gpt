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
    },
    { 
        'description': 'This tool gives the astrological aspects for a given date and place. If no city is specified it will for paris. You can get only one day at a time, if you need a longer period you must call the tool for all the dates in the period.',
        'name': 'astrological-aspects',
        'parameters': {
            "type": "object",
            "properties" : {
                "date" : {
                    'description': "The date for the aspects formatted as YYYY-MM-DD",
                    'type': 'string'
                },
                "city" : {
                    'description': "The city used for time zone. Must be one of: paris,london,new_york,berlin,rome,lisbon,istanbul",
                    'type': 'string'
                },

            },
            "required": ["date"]
        }
    },

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
