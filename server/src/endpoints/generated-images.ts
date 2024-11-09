import { Request, Response } from 'express';
import ChatServer from '../index';
import KnexDatabaseAdapter from '../database/knex';
import { config } from '../config';

export default class GeneratedImagesRequestHandler {
    constructor(private server: ChatServer) {}

    public async handle(req: Request, res: Response) {
        try {
            const { page = 1, engine, user_id, prompt } = req.query;
            const limit = 20;
            const offset = (Number(page) - 1) * limit;

            // Access the knex instance using the public method
            const knex = (this.server.database as KnexDatabaseAdapter).getKnexInstance();

            // Build the query
            let query = knex('images')
                .whereNotNull('prompt')
                .whereNotNull('engine')
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset);

            // Apply filters
            if (engine) {
                query = query.andWhere('engine', engine);
            }
            if (user_id) {
                query = query.andWhere('user_id', user_id);
            }
            if (prompt) {
                query = query.andWhere('prompt', 'like', `%${prompt}%`);
            }

            // Execute the query
            const images = await query.select();
            
            res.json({
                success: true,
                data: {
                    baseUrl: (config.services?.openai?.imagesBaseUrl ? config.services.openai.imagesBaseUrl : "") + "images/",
                    images}
                    ,
                page: Number(page),
                limit,
            });
        } catch (error) {
            console.error('Error fetching generated images:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
