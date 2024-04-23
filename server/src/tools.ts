import { config, ToolLambdaSource, ToolUrlSource } from './config';

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

export interface ToolsDefinitionDict {
    [key: string]: ToolUrlSource | ToolLambdaSource
}
export interface FetchedTools {    
    tools : ToolFunction[];
    toolsDefinitions :  ToolsDefinitionDict;
}
//let fetchedTools: Array<ToolUrlSource | ToolLambdaSource> =  [];

/*
const tools : ToolFunction[] =[
    { 
        'description': 'This tool manages all interactions with Graam ( aka Wephone ) for Wengo / Mybestpro which is a Callcenter application. You can ask it for any information about Graam\'s database',
        'name': 'graam-tool',
        'parameters': {
            "type": "object",
            "properties" : {
                "question" : {
                    'description': "The question to ask about Graam ( aka Wephone ) 's Wengo or Mybestpro database",
                    'type': 'string'
                }
            },
            "required": ["question"]
        }
    },
    { 
        'description': 'This tool manages all interactions with Graam ( aka Wephone ) for HabitatPresto akaHP which is a Callcenter application. You can ask it for any information about Graam\'s database',
        'name': 'graam-tool-hp',
        'parameters': {
            "type": "object",
            "properties" : {
                "question" : {
                    'description': "The question to ask about Graam ( aka Wephone ) 's HabitatPresto aka HP database",
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
*/


export async function fetchTools(): Promise<FetchedTools> {
    const availableToolsSources = config.tools;
    const tools : ToolFunction[] = []
    const toolsDefinitions :  { [key: string] : ToolUrlSource | ToolLambdaSource } =  {};
    if (availableToolsSources) {
        for ( const source of availableToolsSources.sources) {
            if ( source.type === 'url') {
                const urlSource = source as ToolUrlSource;
                try {
                    const response = await fetch(urlSource.url);
                    if (response.ok) {
                        const jsonData = await response.json();
                        console.log('JSON Data from:', urlSource.url, jsonData);
                        
                        for ( const data of jsonData) {
                            tools.push(data.openapispec);
                            toolsDefinitions[data.openapispec.name] = {
                                name: data.openapispec.name,
                                type: "url",
                                url: new URL( data.tool_url, urlSource.url).href
                            }
                        }

                    } else {
                        console.error('Failed to fetch from:', urlSource.url, response.status);
                    }
                } catch (error) {
                    console.error('Error fetching from:', urlSource.url, error);
                }
            } 
            // else if ( source.type === 'lambda'){}                    
        }
    }

    // manually add lambda
    tools.push({ 
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
    })
    toolsDefinitions['astrological-aspects'] = {
        name: "astrological-aspects",
        type: "lambda",
        region: "eu-west-3",
        function_name: "lambda_astrodata"
    }
    console.log("Fetched tools Definitions:", toolsDefinitions);
    return { tools, toolsDefinitions};

}

