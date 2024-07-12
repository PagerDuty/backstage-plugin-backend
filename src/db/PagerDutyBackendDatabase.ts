import { PagerDutyEntityMapping } from "@pagerduty/backstage-plugin-common";
import { resolvePackagePath } from "@backstage/backend-plugin-api";
import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export type RawDbEntityResultRow = {
    id: string;
    entityRef: string;
    serviceId: string;
    integrationKey: string;
    account?: string;
    processedDate?: Date;
};

/** @public */
export interface PagerDutyBackendStore {
    insertEntityMapping(entity: PagerDutyEntityMapping): Promise <string> 
    getAllEntityMappings(): Promise<RawDbEntityResultRow[]>
    findEntityMappingByEntityRef(entityRef: string): Promise<RawDbEntityResultRow | undefined>
}

type Options = {
    skipMigrations?: boolean;
};

/** @public */
export class PagerDutyBackendDatabase implements PagerDutyBackendStore {
    static async create(knex: Knex, options?: Options): Promise<PagerDutyBackendStore> {
        if(options?.skipMigrations) {
            const migrationsDir = resolvePackagePath("@pagerduty/backstage-plugin-backend", "migrations");
            
            await knex.migrate.latest({
                directory: migrationsDir,
            });
        }

        return new PagerDutyBackendDatabase(knex);
    }

    constructor(private readonly db: Knex) { }

    async insertEntityMapping(entity: PagerDutyEntityMapping): Promise<string> {
        const entityMappingId = uuid();

        const [result] = await this.db<RawDbEntityResultRow>('pagerduty_entity_mapping')
            .insert({
                id: entityMappingId,
                entityRef: entity.entityRef,
                serviceId: entity.serviceId,
                integrationKey: entity.integrationKey,
                account: entity.account,
                processedDate: new Date(),
            })
            .onConflict(['serviceId'])
            .merge(['entityRef', 'integrationKey', 'account', 'processedDate'])
            .returning('id');

        return result.id;
    }

    async getAllEntityMappings(): Promise<RawDbEntityResultRow[]> {
        const rawEntities = await this.db<RawDbEntityResultRow>('pagerduty_entity_mapping');

        if (!rawEntities) {
            return [];
        }

        return rawEntities;
    }

    async findEntityMappingByEntityRef(entityRef: string): Promise<RawDbEntityResultRow | undefined> {
        const rawEntity = await this.db<RawDbEntityResultRow>('pagerduty_entity_mapping')
            .where('entityRef', entityRef)
            .first();

        return rawEntity;
    }
}