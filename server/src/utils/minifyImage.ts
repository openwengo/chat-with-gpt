import sharp from 'sharp';
import { Knex } from 'knex';
import ObjectStore from '../object-store'; // Use generic ObjectStore

export async function createMinifiedImage(knex: Knex, objectStore: ObjectStore, imageId: string, prompt: string, userId: string) {
    // Check if the minified image already exists in the database
    const minifiedImageId = `${imageId}_min`;
    const existingMinifiedImage = await knex('images').where({ id: minifiedImageId }).first();
    if (existingMinifiedImage) {
        console.log(`Minified image already exists for image ID: ${imageId}`);
        return minifiedImageId; // Return the existing minified image ID
    }

    // Fetch the original image from the database
    const image = await knex('images').where({ id: imageId }).first();
    if (!image) {
        throw new Error('Image not found');
    }

    // Fetch the image binary from object storage using the getBinary method
    const originalImageBuffer = await objectStore.getBinary(`images/${imageId}.png`);
    if (!originalImageBuffer) {
        throw new Error('Image data not found in object storage');
    }

    try {
        // Resize the image to a maximum dimension of 200 pixels
        const minifiedImageBuffer = await sharp(originalImageBuffer)
            .resize({ width: 200, height: 200, fit: 'inside' })
            .toBuffer();

        const minifiedImageUrl = `images/${minifiedImageId}.png`;
    
        // Store the minified image in object storage
        await objectStore.putBinary(minifiedImageUrl, minifiedImageBuffer, 'image/png');

        // Insert the minified image into the database
        await knex('images').insert({
            id: minifiedImageId,
            prompt: prompt,
            user_id: userId,
            engine: image.engine,
            created_at: new Date()
        });

        return minifiedImageId;
    } catch (error) {
        const err = error as Error;
        console.error(`Error processing image ID: ${imageId}`, err);
        throw err;
    }
}
