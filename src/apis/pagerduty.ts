import { PagerDutyCreateIntegrationResponse, PagerDutyCreateServiceResponse } from "../types";

export async function createService(name: string, description: string, escalationPolicyId: string): Promise<[string, string]> {
    let response: Response;
    const baseUrl = 'https://api.pagerduty.com/services';
    const options: RequestInit = {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            description: description,
            escalation_policy: {
                id: escalationPolicyId,
                type: 'escalation_policy_reference',
            },
        }),
        headers: {
            Authorization: `Token token=${process.env.PAGERDUTY_TOKEN}`,
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };

    try {
        response = await fetch(baseUrl, options);
    } catch (error) {
        throw new Error(`Failed to create service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new Error(`Failed to create service. Caller provided invalid arguments.`);
        case 401:
            throw new Error(`Failed to create service. Caller did not supply credentials or did not provide the correct credentials.`);
        case 402:
            throw new Error(`Failed to create service. Account does not have the abilities to perform the action.`);
        case 403:
            throw new Error(`Failed to create service. Caller is not authorized to view the requested resource.`);
        default: // 201
            break;
    }

    let result: PagerDutyCreateServiceResponse;
    try {
        result = await response.json();

        return [result.service.id, result.service.htmlUrl];
    } catch (error) {
        throw new Error(`Failed to parse service information: ${error}`);
    }
}

export async function createServiceIntegration(serviceId: string, vendorId: string): Promise<string> {
    let response: Response;
    const baseUrl = 'https://api.pagerduty.com/services';
    const options: RequestInit = {
        method: 'POST',
        body: JSON.stringify({
            integration: {
                name: 'Backstage',
                service: {
                    id: serviceId,
                    type: 'service_reference',
                },
                vendor: {
                    id: vendorId,
                    type: 'vendor_reference',
                }
            }
        }),
        headers: {
            Authorization: `Token token=${process.env.PAGERDUTY_TOKEN}`,
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };

    try {
        response = await fetch(`${baseUrl}/${serviceId}/integrations`, options);
    } catch (error) {
        throw new Error(`Failed to create service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new Error(`Failed to create service integration. Caller provided invalid arguments.`);
        case 401:
            throw new Error(`Failed to create service integration. Caller did not supply credentials or did not provide the correct credentials.`);
        case 403:
            throw new Error(`Failed to create service integration. Caller is not authorized to view the requested resource.`);
        case 429:
            throw new Error(`Failed to create service integration. Rate limit exceeded.`);
        default: // 201
            break;
    }

    let result: PagerDutyCreateIntegrationResponse;
    try {
        result = await response.json();

        return result.integration.integration_key;

    } catch (error) {
        throw new Error(`Failed to parse service information: ${error}`);
    }
}
