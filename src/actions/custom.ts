import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import fetch from 'cross-fetch';
import { z } from 'zod';

// expose publicly
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
        },
        
        async handler(ctx) {            
            let response: Response;
            const baseUrl = 'https://api.pagerduty.com/services';
            const options: RequestInit = {
                method: 'POST',
                body: JSON.stringify({
                    name: ctx.input.name,
                    description: ctx.input.description,
                    escalation_policy: {
                        id: ctx.input.escalationPolicyId,
                        type: 'escalation_policy_reference',
                    },
                }),
                headers: {
                    Authorization: `Token token=${process.env.PAGERDUTY_TOKEN}`,
                    'Accept': 'application/vnd.pagerduty+json;version=2',
                    'Content-Type': 'application/json',
                },
            };

            ctx.logger.info(`Token token=${process.env.PAGERDUTY_TOKEN}`);

            try {
                response = await fetch(baseUrl, options);
            } catch (error) {
                throw new Error(`Failed to create service: ${error}`);
            }

            switch (response.status) {
                case 400:
                    throw new Error(`Failed to create service. Caller provided invalid arguments. ${await response.text()}`);
                case 401:
                    throw new Error(`Failed to create service. Caller did not supply credentials or did not provide the correct credentials. ${await response.text()}`);
                case 402:
                    throw new Error(`Failed to create service. Account does not have the abilities to perform the action. ${await response.text()}`);
                case 403:
                    throw new Error(`Failed to create service. Caller is not authorized to view the requested resource. ${await response.text()}`);
                default: // 201
                    ctx.logger.info(`Service ${ctx.input.name} created successfully!`);
                    break;
            }
        }
    });
};