import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

/**
 * The Config interface represents the configuration settings for various components
 * of the application, such as the server, database and external services.
 * 
 * You may provide a `config.yaml` file in the `data` directory to override the default values.
 * (Or you can set the `CHATWITHGPT_CONFIG_FILENAME` environment variable to point to a different file.)
 */
export interface Config {
    datasources?: {
        wengodb?: {
            host: string;
            username: string;
            password: string;
            database: string;
            port?: number;
        };
    };
}

// default config:
let config: Config = {
    datasources: {
    }
};

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

let filename = process.env.LANGCHAIN_CONFIG_FILENAME as string;

// assume config.yaml if no filename is provided:
if (!filename) {
    filename = path.resolve(__dirname, '../data/langchainconfig.yaml')
    
    // try config.yml if config.yaml doesn't exist:
    const fallbackFilename = path.resolve(__dirname, '../data/langchainconfig.yml');
    if (!fs.existsSync(filename) && fs.existsSync(fallbackFilename)) {
        filename = fallbackFilename;
    }
}

if (fs.existsSync(filename)) {
    config = {
        ...config,
        ...parse(fs.readFileSync(filename).toString()),
    };
    //console.log("Loaded config from:", filename, config);
}

export {
    config
};