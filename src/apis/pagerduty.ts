import { PagerDutyCreateIntegrationResponse, PagerDutyCreateServiceResponse, PagerDutyEscalationPolicyListResponse, PagerDutyEscalationPolicy, HttpError, PagerDutyAbilitiesListResponse, CreateServiceResponse } from "../types";

// Supporting custom actions

export async function createService(name: string, description: string, escalationPolicyId: string, alertGrouping?: string): Promise<CreateServiceResponse> {
    let alertGroupingParameters = "null";
    let response: Response;
    const baseUrl = 'https://api.pagerduty.com/services';

    // Set default body
    let body = JSON.stringify({
        service: {
            type: 'service',
            name: name,
            description: description,
            alert_creation: 'create_alerts_and_incidents',
            auto_pause_notifications_parameters: {
                enabled: true,
                timeout: 300,
            },
            escalation_policy: {
                id: escalationPolicyId,
                type: 'escalation_policy_reference',
            },
        },
    });

    // Override body if alert grouping is enabled and passed as parameter
    if (await isEventNoiseReductionEnabled() && alertGrouping !== undefined) {
        alertGroupingParameters = alertGrouping;

        switch (alertGroupingParameters) {
            case "intelligent":
                body = JSON.stringify({
                    service: {
                        type: 'service',
                        name: name,
                        description: description,
                        escalation_policy: {
                            id: escalationPolicyId,
                            type: 'escalation_policy_reference',
                        },
                        alert_creation: 'create_alerts_and_incidents',
                        alert_grouping_parameters: {
                            type: alertGroupingParameters,
                        },
                        auto_pause_notifications_parameters: {
                            enabled: true,
                            timeout: 300,
                        },
                    },
                });
                break;
            case "time":
                body = JSON.stringify({
                    service: {
                        type: 'service',
                        name: name,
                        description: description,
                        escalation_policy: {
                            id: escalationPolicyId,
                            type: 'escalation_policy_reference',
                        },
                        alert_creation: 'create_alerts_and_incidents',
                        alert_grouping_parameters: {
                            type: alertGroupingParameters,
                            config: {
                                timeout: 0,
                            },
                        },
                        auto_pause_notifications_parameters: {
                            enabled: true,
                            timeout: 300,
                        },
                    },
                });
                break;
            case "content_based":
                body = JSON.stringify({
                    service: {
                        type: 'service',
                        name: name,
                        description: description,
                        escalation_policy: {
                            id: escalationPolicyId,
                            type: 'escalation_policy_reference',
                        },
                        alert_creation: 'create_alerts_and_incidents',
                        alert_grouping_parameters: {
                            type: alertGroupingParameters,
                            config: {
                                aggregate: 'all',
                                time_window: 0,
                                fields: [
                                    'source',
                                    'summary',
                                ],
                            },
                        },
                        auto_pause_notifications_parameters: {
                            enabled: true,
                            timeout: 300,
                        },
                    },
                });
                break;
            default:
                break;
        }
    }

    const options: RequestInit = {
        method: 'POST',
        body: body,
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

        const createServiceResult: CreateServiceResponse = {
            url: result.service.htmlUrl,
            id: result.service.id,
            alertGrouping: alertGroupingParameters,
        };

        return createServiceResult;

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

        throw new HttpError(`${((error as HttpError).message)}`, ((error as HttpError).status));
    }
}

export async function isEventNoiseReductionEnabled(): Promise<boolean> {
    let response: Response;
    const baseUrl = 'https://api.pagerduty.com';
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: `Token token=${process.env.PAGERDUTY_TOKEN}`,
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };

    try {
        response = await fetch(`${baseUrl}/abilities`, options);
    } catch (error) {
        throw new Error(`Failed to read abilities: ${error}`);
    }

    switch (response.status) {
        case 401:
            throw new Error(`Failed to read abilities. Caller did not supply credentials or did not provide the correct credentials.`);
        case 403:
            throw new Error(`Failed to read abilities. Caller is not authorized to view the requested resource.`);
        case 429:
            throw new Error(`Failed to read abilities. Rate limit exceeded.`);
        default: // 200
            break;
    }

    let result: PagerDutyAbilitiesListResponse;
    try {
        result = await response.json();

        if (result.abilities.includes('preview_intelligent_alert_grouping')
            && result.abilities.includes('time_based_alert_grouping')) {
            return true;
        }

        return false;

    } catch (error) {
        throw new Error(`Failed to parse abilities information: ${error}`);
    }
}