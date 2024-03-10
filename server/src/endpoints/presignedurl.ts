import express from 'express';
import RequestHandler from "./base";
import { config } from '../config';


function getSupportedExtension(mimeType: string): string | false {
    const mapping: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
  
    return mapping[mimeType] || 'img';
  }

export default class PresignedRequestHandler extends RequestHandler {
    async handler(req: express.Request, res: express.Response) {
        const { nanoid } = await import('nanoid'); // esm

        const loggedUser = (req as any).session?.passport?.user?.id;

        if (!req.body.fileType) {
            res.sendStatus(400);
            return;
        }

        let id = '';
        if ( req.body.hash) {
            id = req.body.hash;            
        } else {
            id = nanoid();
        }

        const ext = getSupportedExtension(req.body.fileType);
        const new_image_url = 'images/upload/' + id + '.' + ext;
        console.log(`upload url will be to ${new_image_url}`);

        try {
            await this.context.database.createImage(loggedUser, 'upload_' + id);
        } catch (e) {
            console.log("failed to create entry for image in database:", e);
        }
        const public_image_url= ( config.services?.openai?.imagesBaseUrl ? config.services.openai.imagesBaseUrl : "" ) + new_image_url;
            
        const upload_url = await this.context.objectStore.getSignedPutUrl(new_image_url, req.body.fileType);

        res.json({upload_url, public_image_url})
    }
    
    public isProtected() {
        return true;
    }

}
