import Memcached from 'memcached' ;
import { config }  from "../config";


export const memcached = config.memcached ? new Memcached(config.memcached.servers, { retries: 1, retry: 1000, remove: false}) : null ;

// Function to store a value
export async function storeValue(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        memcached ?  memcached.set(key, value, config?.memcached?.timeout ? config.memcached.timeout : 3600 , (err) => {
            if (err) reject(err);
            else resolve();
        }) : reject('no memcached server available') ;
    });
}

// Function to retrieve a value
export async function getValue(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
        memcached ? memcached.get(key, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        }) : reject('no memcached server available') ;
    });
}
