import { createMinifiedImage } from '../src/utils/minifyImage';
import KnexDatabaseAdapter from '../src/database/knex';
import S3ObjectStore from '../src/object-store/s3'; // Use S3ObjectStore
import { config } from '../src/config';

async function generateMinifiedImages() {
    const knex = new KnexDatabaseAdapter().getKnexInstance();
    const objectStore = new S3ObjectStore(); // Use S3ObjectStore

    // Initialize object store
    await objectStore.initialize();

    // Fetch all images that do not have a minified version
    const images = await knex('images as original')
        .whereNotNull('original.prompt')
        .andWhere('original.id', 'not like', '%_min') // Skip images with a minified ID
        .whereNotExists(
            knex('images as minified')
                .whereRaw('minified.id = original.id || \'_min\'') // Check if the minified version exists
        );

    for (const image of images) {
        const { id, prompt, user_id } = image;

        try {
            // Generate and store the minified image
            await createMinifiedImage(knex, objectStore, id, prompt, user_id);
            console.log(`Minified image created for image ID: ${id}`);
        } catch (error) {
            console.error(`Failed to create minified image for image ID: ${id}`, error);
        }
    }

    console.log('Minified image generation completed.');
}

generateMinifiedImages().catch((error) => {
    console.error('Error generating minified images:', error);
    process.exit(1);
});
