import { validate as validateEmailAddress } from 'email-validator';
import { Knex, knex as KnexClient } from 'knex';
import TextsDatabase from "./index";
import { config } from '../config';

const tableNames = {
    texts: 'texts',
    prompts: 'prompts',
};

export default class KnexTextsDatabaseAdapter extends TextsDatabase {
    private knex = KnexClient(this.knexConfig);

    constructor(private knexConfig: Knex.Config = config.database) {
        super();
    }

    public async initialize() {
        console.log(`Initializing database adapter for ${this.knexConfig.client}.`);
        await this.createTables();
    }

    private async createTables() {
        await this.createTableIfNotExists(tableNames.texts, (table) => {
            table.increments('id').primary();
            table.text('textHash');
            table.text('promptHash');
            table.text('text');
            table.unique(['textHash', 'promptHash']);
            table.index('promptHash', 'promptHash_idx');
        });

        await this.createTableIfNotExists(tableNames.prompts, (table) => {
            table.increments('id').primary();
            table.text('promptHash');
            table.text('text');
            table.unique('promptHash');
        });

    }

    private async createTableIfNotExists(tableName: string, tableBuilderCallback: (tableBuilder: Knex.CreateTableBuilder) => any) {
        const exists = await this.knex.schema.hasTable(tableName);
        if (!exists) {
            await this.knex.schema.createTable(tableName, tableBuilderCallback);
        }
    }

    public async insertText(textHash: string, promptHash: string, text: string ): Promise<void> {
        await this.knex(tableNames.texts).insert({
            textHash: textHash,
            promptHash: promptHash,
            text: text
        });
    }

    public async getText(textHash: string, promptHash: string ): Promise<any> {
        const row = await this.knex(tableNames.texts).select('*').where(
            {'textHash': textHash, 'promptHash': promptHash}).first();
        if (!row) {
            return null ;
        }
        return row;
    }

    public async insertPrompt(promptHash: string, text: string ): Promise<void> {
        const insert = await this.knex(tableNames.prompts).insert({
            promptHash: promptHash,
            text: text
        });
        console.log("Insert Prompt:", insert);
    }

    public async getPrompt(promptHash: string ): Promise<any> {
        const row = await this.knex(tableNames.prompts).select('*').where(
            {'promptHash': promptHash}).first();                    
        console.log("getPrompt:", row);
        if (!row) {
            return null ;
        }
        return row;
    }


}