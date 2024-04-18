import express from 'express';
import RequestHandler from "../endpoints/base";
import { config, ToolLambdaSource, ToolUrlSource } from '../config.js';
import { fetchTools }  from "../tools" ;

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

export interface FetchedTools {
    name: string;

}

//export let toolsDefinition = await fetchTools();

export default class ToolsDatabaseRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const loggedUser = (req as any).session?.passport?.user?.id;

        const fetchedTools = await fetchTools();
        this.context.fetchedTools = fetchedTools ;

        res.json(fetchedTools.tools);
    }
    
    public isProtected() {
        return true;
    }

}
