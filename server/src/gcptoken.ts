import { GoogleAuth } from 'google-auth-library';
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

async function getFrozenCredentials() {
    try {
        const credentialsProvider = fromNodeProviderChain();
        const credentials = await credentialsProvider();
        
        return {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
        };
    } catch (error) {
      console.error("Error getting credentials:", error);
      throw error;
    }
  }

export async function getGCPAccessToken(projectId: string) {

    if (process.env.AWS_ACCESS_KEY_ID) delete process.env.AWS_ACCESS_KEY_ID;
    if (process.env.AWS_SECRET_ACCESS_KEY) delete process.env.AWS_SECRET_ACCESS_KEY;
    if (process.env.AWS_SESSION_TOKEN) delete process.env.AWS_SESSION_TOKEN;

    const frozenCredentials = await getFrozenCredentials();

    process.env.AWS_ACCESS_KEY_ID = frozenCredentials.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = frozenCredentials.secretAccessKey;
    if (frozenCredentials.sessionToken) {
        process.env.AWS_SESSION_TOKEN = frozenCredentials.sessionToken;
    } 

    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId: projectId
      });
  
      const client = await auth.getClient();
      //console.log("client=", client);
      const token = await client.getAccessToken();
      //console.log("token=", token);

      return token.token;
    } catch (error) {
      console.error('Error getting GCP access token:', error);
      throw error;
    } finally {
        if (process.env.AWS_ACCESS_KEY_ID) delete process.env.AWS_ACCESS_KEY_ID;
        if (process.env.AWS_SECRET_ACCESS_KEY) delete process.env.AWS_SECRET_ACCESS_KEY;
        if (process.env.AWS_SESSION_TOKEN) delete process.env.AWS_SESSION_TOKEN;
    }
}