import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { z } from 'zod';
import * as api from '../apis/pagerduty';

export const createPagerDutyServiceAction = () => {

    return createTemplateAction<{
        name: string;
        description: string;
        escalationPolicyId: string;
    }>({
        id: 'pagerduty:service:create',
        schema: {
            input: z.object({
                name: z.string().min(1, "name is required").describe('Name of the service'),
                description: z.string().min(1, "description is required").describe('Description of the service'),
                escalationPolicyId: z.string().min(1, "Escalation policy is required").describe('Escalation policy ID'),
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
                const [serviceId, serviceUrl] = await api.createService(ctx.input.name, ctx.input.description, ctx.input.escalationPolicyId);
                ctx.logger.info(`Service '${ctx.input.name}' created successfully!`);

                ctx.output('serviceUrl', serviceUrl);
                ctx.output('serviceId', serviceId);

                // Create Backstage Integration in PagerDuty service
                const backstageIntegrationId = 'PRO19CT'; // ID for Backstage integration
                const integrationKey = await api.createServiceIntegration(serviceId, backstageIntegrationId);
                ctx.logger.info(`Backstage Integration for service '${ctx.input.name}' created successfully!`);

                ctx.output('integrationKey', integrationKey);
            } catch (error) {
                ctx.logger.error(`${error}`);
            }

        }
    });
};
