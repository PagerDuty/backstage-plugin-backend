import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { getAllEscalationPolicies, getChangeEvents, getIncidents, getOncallUsers, getServiceById, getServiceByIntegrationKey } from '../apis/pagerduty';
import { HttpError, PagerDutyChangeEventsResponse, PagerDutyIncidentsResponse, PagerDutyOnCallUsersResponse, PagerDutyServiceResponse } from '@pagerduty/backstage-plugin-common';

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
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /oncall
    router.get('/oncall-users', async (request, response) => {
        try {
            // Get the escalation policy ID from the request parameters with parameter name "escalation_policy_ids[]"
            const escalationPolicyId: string = request.query.escalation_policy_ids as string || '';

            if (escalationPolicyId === '') {
                response.status(400).json("Bad Request: 'escalation_policy_ids[]' is required");
            }

            const oncallUsers = await getOncallUsers(escalationPolicyId);
            const onCallUsersResponse: PagerDutyOnCallUsersResponse = {
                users: oncallUsers
            };

            response.json(onCallUsersResponse);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /services/:serviceId
    router.get('/services/:serviceId', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const serviceId: string = request.params.serviceId || '';

            if (serviceId === '') {
                response.status(400).json("Bad Request: ':serviceId' must be provided as part of the path or 'integration_key' as a query parameter");
            }

            const service = await getServiceById(serviceId);
            const serviceResponse: PagerDutyServiceResponse = {
                service: service
            }

            response.json(serviceResponse);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /services?integration_key=:integrationKey
    router.get('/services', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const integrationKey: string = request.query.integration_key as string || '';

            if (integrationKey === '') {
                response.status(400).json("Bad Request: 'integration_key' parameter is required");
            }

            const service = await getServiceByIntegrationKey(integrationKey);
            const serviceResponse: PagerDutyServiceResponse = {
                service: service
            }

            response.json(serviceResponse);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /services/:serviceId/change-events
    router.get('/services/:serviceId/change-events', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const serviceId: string = request.params.serviceId || '';

            const changeEvents = await getChangeEvents(serviceId);
            const changeEventsResponse: PagerDutyChangeEventsResponse = {
                change_events: changeEvents
            }

            response.json(changeEventsResponse);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /services/:serviceId/incidents
    router.get('/services/:serviceId/incidents', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const serviceId: string = request.params.serviceId || '';

            const incidents = await getIncidents(serviceId);
            const incidentsResponse: PagerDutyIncidentsResponse = {
                incidents
            }

            response.json(incidentsResponse);
        } catch (error) {
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
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