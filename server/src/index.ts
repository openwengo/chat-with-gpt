require('dotenv').config()

import compression from 'compression';
import express from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import { configureAuth0 } from './auth0';
import { config } from './config';
import Database from './database/index';
import KnexDatabaseAdapter from './database/knex';

import GetShareRequestHandler from './endpoints/get-share';
import HealthRequestHandler from './endpoints/health';
import DeleteChatRequestHandler from './endpoints/delete-chat';
import ToolsDatabaseRequestHandler from './endpoints/tools';
import { FetchedTools, fetchTools } from './tools' ;
import ElevenLabsTTSProxyRequestHandler from './endpoints/service-proxies/elevenlabs/text-to-speech';
import ElevenLabsVoicesProxyRequestHandler from './endpoints/service-proxies/elevenlabs/voices';
import MidjourneyRequestHandler from './endpoints/service-proxies/midjourney/';
import Dalle3RequestHandler from './endpoints/service-proxies/dall-e3/';
import ImagenProxyRequestHandler from './endpoints/service-proxies/imagen';
import PresignedRequestHandler from './endpoints/presignedurl' ;

import OpenAIProxyRequestHandler, {WengoToolRequestHandler} from './endpoints/service-proxies/openai/';
import CubeJSProxyRequestHandler from './endpoints/service-proxies/cubejs';
import SessionRequestHandler from './endpoints/session';
import ShareRequestHandler from './endpoints/share';
import ObjectStore from './object-store/index';
import S3ObjectStore from './object-store/s3';
import SQLiteObjectStore from './object-store/sqlite';
import { configurePassport } from './passport';
import SyncRequestHandler, { getNumUpdatesProcessedIn5Minutes, YdocRequestHandler } from './endpoints/sync';
import LegacySyncRequestHandler from './endpoints/sync-legacy';
import { getActiveUsersInLast5Minutes } from './endpoints/base';
import { formatTime } from './utils';
import morgan from 'morgan';
import ip from 'ip';


process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

if (process.env.CI) {
    setTimeout(() => process.exit(), 10000);
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

export default class ChatServer {
    authProvider = 'local';
    app: express.Application;
    objectStore: ObjectStore = process.env.S3_BUCKET ? new S3ObjectStore() : new SQLiteObjectStore();
    database: Database = new KnexDatabaseAdapter();
    fetchedTools: FetchedTools = { tools: [], toolsDefinitions:{}} ;

    constructor() {
        this.app = express();
    }

    async initialize() {
        //const { default: helmet } = await import('helmet');
        //this.app.use(helmet());

        console.log("Configuration:", config);

        // logs
        if (config.httpLogs) {
            console.log("Enable http logs with value:", config.httpLogs)

            morgan.token('remote-user', function (req ,res) {
                return (req as any).session?.passport?.user?.id ;
            })
            
            this.app.use(morgan(config.httpLogs))
        }
        // trusted proxies
        if (config.trustedProxies)  {
            console.log("Set trusted proxies:", config.trustedProxies)
            this.app.set('trust proxy', (ipAddress: string) => config.trustedProxies?.some((prefix: string) => ip.cidrSubnet(prefix).contains(ipAddress)));
        }
        
        // Initialize database before auth
        await this.database.initialize();

        // Initialize tools
        if ( config.tools ) {
            try {
                this.fetchedTools = await fetchTools();
            } catch(e) {
                console.log("Failed to prefetch tools with error:", e);
            }
        }

        this.app.use(express.urlencoded({ extended: false }));
        
        
        if (config.auth0?.clientID && config.auth0?.issuer && config.publicSiteURL) {
            console.log('Configuring Auth0.');
            this.authProvider = 'auth0';
            configureAuth0(this);
        } else if ( config.google?.clientID && config.google?.clientSecret ) {
            console.log('Configure Passport for Google Auth');
            this.authProvider = 'google';
            configurePassport(this);
        } else {
            console.log('Configuring Passport.');
            this.authProvider = 'local';
            configurePassport(this);
        }

        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(compression({
            filter: (req, res) => !req.path.includes("proxies"),
        }));

        const { default: rateLimit } = await import('express-rate-limit'); // esm

        this.app.get('/chatapi/health', (req, res) => new HealthRequestHandler(this, req, res));

        this.app.get('/chatapi/session',
            rateLimit({ windowMs: 60 * 1000, max: 100 }),
            (req, res) => new SessionRequestHandler(this, req, res));

        this.app.post('/chatapi/y-sync',
            rateLimit({ windowMs: 60 * 1000, max: 100 }),
            express.raw({ type: 'application/octet-stream', limit: '20mb' }),
            (req, res) => new SyncRequestHandler(this, req, res));

        this.app.get('/chatapi/y-doc',
            rateLimit({ windowMs: 60 * 1000, max: 100 }),
            express.raw({ type: 'application/octet-stream', limit: '10mb' }),
            (req, res) => new YdocRequestHandler(this, req, res));

        this.app.get('/chatapi/legacy-sync',
            rateLimit({ windowMs: 60 * 1000, max: 100 }),
            (req, res) => new LegacySyncRequestHandler(this, req, res));

        this.app.use(rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.max,
        }));
        
        this.app.post('/chatapi/delete', (req, res) => new DeleteChatRequestHandler(this, req, res));
        this.app.get('/chatapi/share/:id', (req, res) => new GetShareRequestHandler(this, req, res));
        this.app.post('/chatapi/share', (req, res) => new ShareRequestHandler(this, req, res));

        this.app.post('/chatapi/presignedUrl', (req, res) => new PresignedRequestHandler(this, req, res));
        
        this.app.get('/chatapi/tools', (req, res) => new ToolsDatabaseRequestHandler(this, req, res)) ;

        this.app.post('/chatapi/proxies/tools/wengo', (req, res) => new WengoToolRequestHandler(this, req, res));

        if (config.services?.openai?.apiKey) {
            this.app.post('/chatapi/proxies/openai/v1/chat/completions', (req, res) => new OpenAIProxyRequestHandler(this, req, res));
        }
        
        if (config.services?.openrouter?.apiKey) {
            this.app.post('/chatapi/proxies/openrouter/v1/chat/completions', (req, res) => new OpenAIProxyRequestHandler(this, req, res));
        }

        if (config.services?.elevenlabs?.apiKey) {
            this.app.post('/chatapi/proxies/elevenlabs/v1/text-to-speech/:voiceID', (req, res) => new ElevenLabsTTSProxyRequestHandler(this, req, res));
            this.app.get('/chatapi/proxies/elevenlabs/v1/voices', (req, res) => new ElevenLabsVoicesProxyRequestHandler(this, req, res));
        }

        if (config.services?.midjourney?.salaiToken) {
            console.log("Create midjourney routes");
            this.app.post('/chatapi/proxies/midjourney/v1/midjourney', (req, res) => new MidjourneyRequestHandler(this, req, res));
        }

        if (config.services?.openai?.apiKey) {
            console.log("Create dalle3 route");
            this.app.post('/chatapi/proxies/dalle3/v1/dalle3', (req, res) => new Dalle3RequestHandler(this, req, res));
        }

        if (config.services?.imagen?.generateEndpoint) {
            console.log("Create imagen route");
            this.app.post('/chatapi/proxies/imagen/v1/imagen', (req, res) => new ImagenProxyRequestHandler(this, req, res));
        }

        if (config.services?.cubejs?.apiKey) {
            console.log("create cubejs proxy routes");
            this.app.get('/chatapi/proxies/cubejs/v1/cubejs/*', (req,res) => new CubeJSProxyRequestHandler(this, req, res));
            this.app.post('/chatapi/proxies/cubejs/v1/cubejs/*', (req,res) => new CubeJSProxyRequestHandler(this, req, res));
        }
        
        if (fs.existsSync('public')) {
            const match = /<script>\s*window.AUTH_PROVIDER\s*=\s*"[^"]+";?\s*<\/script>/g;
            const replace = `<script>window.AUTH_PROVIDER="${this.authProvider}"</script>`;

            const indexFilename = "public/index.html";
            let indexSource = fs.readFileSync(indexFilename, 'utf8');

            indexSource = indexSource.replace(match, replace);

            if (fs.existsSync('./data/head.html')) {
                const head = fs.readFileSync('./data/head.html').toString();
                indexSource = indexSource.replace('</head>', ` ${head} </head>`);
            }

            this.app.get('/', (req, res) => {
                res.send(indexSource);
            });

            this.app.use(express.static('public'));

            // serve index.html for all other routes
            this.app.get('*', (req, res) => {
                res.send(indexSource);
            });
        }

        await this.objectStore.initialize();

        try {
            const callback = (https = false) => {
                console.log(`Open ${config.publicSiteURL || `http${https ? 's' : ''}://localhost:3000`} in your browser.`);
            };

            if (config.tls?.key && config.tls?.cert) {
                console.log('Configuring TLS.');

                const server = https.createServer({
                    key: fs.readFileSync(config.tls.key),
                    cert: fs.readFileSync(config.tls.cert),
                }, this.app);
            
                server.listen(port, () => callback(true));
            } else if (config.tls?.selfSigned) {
                console.log('Configuring self-signed TLS.');

                if (!fs.existsSync('./data/key.pem') || !fs.existsSync('./data/cert.pem')) {
                    execSync('sh generate-self-signed-certificate.sh');
                }

                const server = https.createServer({
                    key: fs.readFileSync('./data/key.pem'),
                    cert: fs.readFileSync('./data/cert.pem'),
                }, this.app);
            
                server.listen(port, callback);
            } else {
                this.app.listen(port, callback);
            }
        } catch (e) {
            console.log(e);
        }

        const displayStatistics = () => {
            const activeUsers = getActiveUsersInLast5Minutes();
            
            const activeUsersToDisplay = activeUsers.slice(0, 20);
            const extraActiveUsers = activeUsers.slice(20);

            const numRecentUpdates = getNumUpdatesProcessedIn5Minutes();

            console.log(`[${formatTime()}] ${activeUsers.length} active users and ${numRecentUpdates} updates processed in last 5m`);

            if (extraActiveUsers.length) {
                console.log(`  - Active users: ${activeUsersToDisplay.join(', ')} and ${extraActiveUsers.length} more`);
            } else if (activeUsers.length) {
                console.log(`  - Active users: ${activeUsersToDisplay.join(', ')}`);
            }
        }
        
        setInterval(displayStatistics, 1000 * 60 * 5);
        setTimeout(displayStatistics, 1000 * 30);
    }
}

new ChatServer().initialize();
