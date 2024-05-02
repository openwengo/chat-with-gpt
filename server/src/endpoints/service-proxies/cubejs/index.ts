import express from 'express';
import RequestHandler from "../../base";
import { config } from '../../../config';
import axios from 'axios';
import url from 'url';

const apiUrl = config?.services?.cubejs?.apiUrl;

export default class CubeJSProxyRequestHandler extends RequestHandler {


    async handler(req: express.Request, res: express.Response) {    
        if (apiUrl) {
            if ( req.method === 'POST') {
                const response = await axios.post(`${apiUrl}/POST`, JSON.stringify(req.body), {
                    headers: {
                        'x-request-id': req.headers['x-request-id'],
                        'Authorization': `${config?.services?.cubejs?.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                })

                res.json(response.data);
            } else if (req.method === 'GET') {
                const queryString =  url.parse(req.url).query; 
                console.log("queryString:", queryString);
                const prefixToRemove = "/chatapi/proxies/cubejs/v1/cubejs";
                let fullUrl = apiUrl ;
                if (req.originalUrl.startsWith(prefixToRemove)) {
                    // Remove the prefix
                    const newPath = req.originalUrl.substring(prefixToRemove.length);
        
                    // Prepend the base URL
                    fullUrl = `${apiUrl}${newPath}`;
                }
                console.log("fullUrl:", fullUrl);
                const response = await axios.get(`${fullUrl}`, {
                    headers: {
                        'x-request-id': req.headers['x-request-id'],
                        'Authorization': `${config?.services?.cubejs?.apiKey}`,
                        'Accept': req.headers['Accept'],
                        'Accept-Encoding': req.headers['Accept-Encoding']
                    },
                })
                res.setHeader('Content-Type', response.headers['content-type'] || 'application/json');
                res.send(response.data);    

            }
        }    
    }

    public isProtected() {
        return config.services?.cubejs?.loginRequired ?? true;
    }

}