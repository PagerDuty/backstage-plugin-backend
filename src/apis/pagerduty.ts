import { PagerDutyCreateIntegrationResponse, PagerDutyCreateServiceResponse, PagerDutyEscalationPolicyListResponse, PagerDutyEscalationPolicy, HttpError } from "../types";

// Supporting custom actions

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

// Supporting router

async function getEscalationPolicies(offset: number, limit: number): Promise<[Boolean, PagerDutyEscalationPolicy[]]> {
    let response: Response;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: `Token token=${process.env.PAGERDUTY_TOKEN}`,
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = 'https://api.pagerduty.com/escalation_policies';

    try {
        response = await fetch(`${baseUrl}?total=true&sort_by=name&offset=${offset}&limit=${limit}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve escalation policies: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to list escalation policies. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to list escalation policies. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to list escalation policies. Caller is not authorized to view the requested resource.", 403);
        case 429:
            throw new HttpError("Failed to list escalation policies. Rate limit exceeded.", 429);
        default: // 200
            break;
    }

    let result: PagerDutyEscalationPolicyListResponse;
    try {
        result = await response.json();

        return [result.more, result.escalation_policies];
        
    } catch (error) {
        throw new HttpError(`Failed to parse escalation policy information: ${error}`, 500);
    }
}

export async function getAllEscalationPolicies(offset: number = 0): Promise<PagerDutyEscalationPolicy[]> {
    const limit = 50;

    try {
        const res = await getEscalationPolicies(offset, limit);        
        const results = res[1];

        // if more results exist
        if (res[0]) {
            return results.concat((await getAllEscalationPolicies(offset + limit)));
        }
        
        return results;
    } catch (error) {
        
        throw new HttpError(`${((error as HttpError).message) }`, ((error as HttpError).status));
    }
}
