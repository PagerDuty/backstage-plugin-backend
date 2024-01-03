import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { z } from 'zod';
import * as api from '../apis/pagerduty';
import { CreateServiceResponse } from '../types';

export const createPagerDutyServiceAction = () => {

    return createTemplateAction<{
        name: string;
        description: string;
        escalationPolicyId: string;
        alertGrouping?: string;
    }>({
        id: 'pagerduty:service:create',
        schema: {
            input: z.object({
                name: z.string().min(1, "name is required").describe('Name of the service'),
                description: z.string().min(1, "description is required").describe('Description of the service'),
                escalationPolicyId: z.string().min(1, "Escalation policy is required").describe('Escalation policy ID'),
                alertGrouping: z.string().optional().describe('Alert grouping parameters'),
            }),
            output: z.object({
                serviceUrl: z.string().describe('PagerDuty Service URL'),
                serviceId: z.string().describe('PagerDuty Service ID'),
                integrationKey: z.string().describe('Backstage Integration Key'),
            }),
        },

        async handler(ctx) {
            try {
                // Create service in PagerDuty
                const service: CreateServiceResponse = await api.createService(
                        ctx.input.name, 
                        ctx.input.description, 
                        ctx.input.escalationPolicyId, 
                        ctx.input.alertGrouping);
                ctx.logger.info(`Service '${ctx.input.name}' created successfully!`);
                ctx.logger.info(`Alert grouping set to '${service.alertGrouping}'`);

                ctx.output('serviceUrl', service.url);
                ctx.output('serviceId', service.id);

                // Create Backstage Integration in PagerDuty service
                const backstageIntegrationId = 'PRO19CT'; // ID for Backstage integration
                const integrationKey = await api.createServiceIntegration(service.id, backstageIntegrationId);
                ctx.logger.info(`Backstage Integration for service '${ctx.input.name}' created successfully!`);

                ctx.output('integrationKey', integrationKey);
            } catch (error) {
                ctx.logger.error(`${error}`);
            }

        }
    });
};
