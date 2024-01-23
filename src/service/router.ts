import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { getAllEscalationPolicies, getOncallUsers } from '../apis/pagerduty';
import { HttpError } from '@pagerduty/backstage-plugin-common';

export interface RouterOptions {
    logger: Logger;
    config: Config;
}

export async function createRouter(
    options: RouterOptions
): Promise<express.Router> {
    const { logger, config } = options;

    // Set the PagerDuty API token as an environment variable if it exists in the config file
    try {
        process.env.PAGERDUTY_TOKEN = config.getString('pagerDuty.apiToken');
    }
    catch (error) {
        logger.error(`Failed to retrieve PagerDuty API token from config file: ${error}`);
        throw error;
    }
    
    // Create the router
    const router = Router();
    router.use(express.json());

    // Add routes
    // GET /escalation_policies
    router.get('/escalation_policies', async (_, response) => {                    
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

    // GET /oncall
    router.get('/oncall-users', async (request, response) => {                    
        try {
            // Get the escalation policy ID from the request parameters with parameter name "escalation_policy_ids[]"
            const escalationPolicyId : string = request.query.escalation_policy_ids as string || '';

            if (escalationPolicyId === '') {
                response.status(400).json('Bad Request: Escalation Policy ID is required');
            }

            const oncallUsers = await getOncallUsers(escalationPolicyId);            

            response.json(oncallUsers);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json(`${error.message}`);
            }
        }
    });

    // GET /health
    router.get('/health', async (_, response) => {
        response.status(200).json({ status: 'ok' });
    });

    // Add error handler
    router.use(errorHandler());

    // Return the router
    return router;
}