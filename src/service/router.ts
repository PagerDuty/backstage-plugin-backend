import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { getAllEscalationPolicies } from '../apis/pagerduty';
import { HttpError } from '../types';

export interface RouterOptions {
    logger: Logger;
    config: Config;
}

export async function createRouter(
    options: RouterOptions
): Promise<express.Router> {
    const { logger, config } = options;

    if (config.getOptionalString('pagerDuty.apiToken') === undefined) {
        throw new Error('No PagerDuty API token was provided.');
    }
    process.env.PAGERDUTY_TOKEN = `${config.getOptionalString('pagerDuty.apiToken')}`;

    const router = Router();
    router.use(express.json());

    router.get('/escalation_policies', async (_, response) => {
        logger.info('Getting escalation policies');

        try {
            const escalationPolicyList = await getAllEscalationPolicies();
            const escalationPolicyDropDownOptions = escalationPolicyList.map((policy) => {
                return {
                    label: policy.name,
                    value: policy.id,
                };
            });

            response.json(escalationPolicyDropDownOptions);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json(`${error.message}`);
            }
        }
    });

    router.get('/health', async (_, response) => {
        response.status(200).json({ status: 'ok' });
    });

    router.use(errorHandler());
    return router;
}