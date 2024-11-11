import { Request, Response } from 'express';
import ChatServer from '../index';
import KnexDatabaseAdapter from '../database/knex';
import { config } from '../config';
import RequestHandler from './base';

// Define endpoint paths as enum for better maintainability
enum GalleryEndpoint {
    GENERATED_IMAGES = '/chatapi/gallery/generated-images',
    USER_IDS = '/chatapi/gallery/user-ids',
    HIDE_IMAGE = '/chatapi/gallery/hide-image'
}

// Define types for request parameters
interface GeneratedImagesQuery {
    page?: string | number;
    engine?: string;
    user_id?: string;
    prompt?: string;
}

interface HideImageBody {
    imageId: string;
    hide: boolean;
}

// Custom error class for better error handling
class GalleryError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'GalleryError';
    }
}

export default class GeneratedImagesRequestHandler extends RequestHandler {
    public async handler(req: Request, res: Response) {
        try {
            const endpoint = this.getEndpoint(req.path);
            await this.handleEndpoint(endpoint, req, res);
        } catch (error) {
            this.handleError(error, res);
        }
    }

    private getEndpoint(path: string): GalleryEndpoint {
        // Normalize path by removing trailing slash if present
        const normalizedPath = path.replace(/\/$/, '');
        
        if (Object.values(GalleryEndpoint).includes(normalizedPath as GalleryEndpoint)) {
            return normalizedPath as GalleryEndpoint;
        }
        
        throw new GalleryError('Invalid endpoint', 404);
    }

    private async handleEndpoint(endpoint: GalleryEndpoint, req: Request, res: Response): Promise<void> {
        switch (endpoint) {
            case GalleryEndpoint.GENERATED_IMAGES:
                await this.getGeneratedImages(req, res);
                break;
            case GalleryEndpoint.USER_IDS:
                await this.getUniqueUserIds(req, res);
                break;
            case GalleryEndpoint.HIDE_IMAGE:
                await this.hideImage(req, res);
                break;
            default:
                throw new GalleryError('Endpoint not implemented', 501);
        }
    }

    private validatePaginationParams(query: GeneratedImagesQuery): { limit: number; offset: number } {
        const page = Number(query.page || 1);
        const limit = 20;

        if (isNaN(page) || page < 1) {
            throw new GalleryError('Invalid page parameter', 400);
        }

        return {
            limit,
            offset: (page - 1) * limit
        };
    }

    private async getGeneratedImages(req: Request, res: Response) {
        try {
            const query = req.query as GeneratedImagesQuery;
            const { limit, offset } = this.validatePaginationParams(query);
            const { engine, user_id, prompt } = query;

            const knex = (this.context.database as KnexDatabaseAdapter).getKnexInstance();

            // Build the base query
            let queryBuilder = knex('images')
                .whereNotNull('prompt')
                .whereNotNull('engine')
                .andWhere('id', 'not like', '%_min')
                .andWhere((builder) => {
                    builder.whereNull('hidden').orWhere('hidden', false);
                })
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset);

            // Apply filters using a more maintainable approach
            const filters: Record<string, any> = {
                engine,
                user_id,
            };

            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    queryBuilder = queryBuilder.andWhere(key, value);
                }
            });

            if (prompt) {
                queryBuilder = queryBuilder.andWhere('prompt', 'like', `%${prompt}%`);
            }

            const images = await queryBuilder.select();
            
            res.json({
                success: true,
                data: {
                    baseUrl: (config.services?.openai?.imagesBaseUrl ? config.services.openai.imagesBaseUrl : "") + "images/",
                    images,
                    pagination: {
                        page: Number(query.page || 1),
                        limit,
                        offset
                    }
                }
            });
        } catch (error) {
            throw new GalleryError(
                'Error fetching generated images',
                error instanceof GalleryError ? error.statusCode : 500,
                error
            );
        }
    }

    private async getUniqueUserIds(req: Request, res: Response) {
        try {
            const knex = (this.context.database as KnexDatabaseAdapter).getKnexInstance();

            const result = await knex('images')
                .distinct('user_id')
                .whereNotNull('prompt')
                .andWhere('id', 'not like', '%_min')
                .andWhere((builder) => {
                    builder.whereNull('hidden').orWhere('hidden', false);
                })
                .orderBy('user_id');

            // Transform the result to get an array of user_id strings
            const userIds = result.map(row => row.user_id);

            res.json({
                success: true,
                data: userIds
            });
        } catch (error) {
            throw new GalleryError(
                'Error fetching unique user IDs',
                error instanceof GalleryError ? error.statusCode : 500,
                error
            );
        }
    }

    private async hideImage(req: Request, res: Response) {
        try {
            const { imageId, hide } = req.body as HideImageBody;
            const loggedUser = (req as any).session?.passport?.user?.id;

            if (!loggedUser) {
                throw new GalleryError('Authentication required', 401);
            }

            if (!imageId || typeof hide !== 'boolean') {
                throw new GalleryError('Invalid request parameters', 400);
            }

            const knex = (this.context.database as KnexDatabaseAdapter).getKnexInstance();

            // First, verify the image exists and belongs to the user
            const image = await knex('images')
                .where({ id: imageId })
                .first();

            if (!image) {
                throw new GalleryError('Image not found', 404);
            }

            if (image.user_id !== loggedUser) {
                throw new GalleryError('Unauthorized: You can only hide your own images', 403);
            }

            // Update the hidden status
            await knex('images')
                .where({ id: imageId })
                .update({ hidden: hide });

            res.json({
                success: true,
                data: {
                    imageId,
                    hidden: hide
                }
            });
        } catch (error) {
            throw new GalleryError(
                'Error updating image visibility',
                error instanceof GalleryError ? error.statusCode : 500,
                error
            );
        }
    }

    private handleError(error: any, res: Response): void {
        console.error('Gallery error:', error);

        if (error instanceof GalleryError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                details: error.details
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Override isProtected to ensure authentication is required
    public isProtected() {
        return true;
    }
}
