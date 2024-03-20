import { getAuthToken } from '../auth/auth';
import {
    CreateServiceResponse,
} from '../types';

import {
    PagerDutyServiceResponse,
    PagerDutyServicesResponse,
    PagerDutyEscalationPolicy,
    PagerDutyEscalationPoliciesResponse,
    PagerDutyIntegrationResponse,
    PagerDutyAbilitiesResponse,
    PagerDutyOnCallsResponse,
    PagerDutyUser,
    PagerDutyService,
    PagerDutyChangeEventsResponse,
    PagerDutyChangeEvent,
    PagerDutyIncident,
    PagerDutyIncidentsResponse,
    PagerDutyServiceStandards,
    PagerDutyServiceMetrics,
    HttpError
} from '@pagerduty/backstage-plugin-common';

import { DateTime } from 'luxon';

let apiBaseUrl = 'https://api.pagerduty.com';
export function setAPIBaseUrl(url: string): void {
    apiBaseUrl = url;
}

// Supporting custom actions
export async function createService(name: string, description: string, escalationPolicyId: string, alertGrouping?: string): Promise<CreateServiceResponse> {
    let alertGroupingParameters = "null";
    let response: Response;
    const baseUrl = `${apiBaseUrl}/services`;

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
            Authorization: await getAuthToken(),
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

    let result: PagerDutyServiceResponse;
    try {
        result = await response.json();

        const createServiceResult: CreateServiceResponse = {
            url: result.service.html_url,
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
    const baseUrl = `${apiBaseUrl}/services`;
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
            Authorization: await getAuthToken(),
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

    let result: PagerDutyIntegrationResponse;
    try {
        result = await response.json();

        return result.integration.integration_key ?? '';

    } catch (error) {
        throw new Error(`Failed to parse service information: ${error}`);
    }
}

// Supporting router

async function getEscalationPolicies(offset: number, limit: number): Promise<[Boolean, PagerDutyEscalationPolicy[]]> {
    let response: Response;
    const params = `total=true&sort_by=name&offset=${offset}&limit=${limit}`;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/escalation_policies`;

    try {
        response = await fetch(`${baseUrl}?${params}`, options);
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

    let result: PagerDutyEscalationPoliciesResponse;
    try {
        result = await response.json();

        return [result.more ?? false, result.escalation_policies];

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
        if (error instanceof HttpError) {
            throw error;
        }
        else {
            throw new HttpError(`${error}`, 500);
        }
    }
}

export async function isEventNoiseReductionEnabled(): Promise<boolean> {
    let response: Response;
    const baseUrl = 'https://api.pagerduty.com';
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
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

    let result: PagerDutyAbilitiesResponse;
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

export async function getOncallUsers(escalationPolicy: string): Promise<PagerDutyUser[]> {
    let response: Response;
    const params = `time_zone=UTC&include[]=users&escalation_policy_ids[]=${escalationPolicy}`;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/oncalls`;

    try {
        response = await fetch(`${baseUrl}?${params}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve oncalls: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to list oncalls. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to list oncalls. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to list oncalls. Caller is not authorized to view the requested resource.", 403);
        case 429:
            throw new HttpError("Failed to list oncalls. Rate limit exceeded.", 429);
        default: // 200
            break;
    }

    let result: PagerDutyOnCallsResponse;
    let usersItem: PagerDutyUser[];
    try {
        result = await response.json();

        if (result.oncalls.length !== 0) {
            const oncallsSorted = [...result.oncalls].sort((a, b) => {
                return a.escalation_level - b.escalation_level;
            });

            const oncallsFiltered = oncallsSorted.filter((oncall) => {
                return oncall.escalation_level === oncallsSorted[0].escalation_level;
            });

            usersItem = [...oncallsFiltered]
                .sort((a, b) => a.user.name > b.user.name ? 1 : -1)
                .map((oncall) => oncall.user);


            // remove duplicates from usersItem
            const uniqueUsers = new Map();
            usersItem.forEach((user) => {
                uniqueUsers.set(user.id, user);
            });

            usersItem.length = 0;
            uniqueUsers.forEach((user) => {
                usersItem.push(user);
            });

            return usersItem;
        }

        return [];

    } catch (error) {
        throw new HttpError(`Failed to parse oncall information: ${error}`, 500);
    }
}

export async function getServiceById(serviceId: string): Promise<PagerDutyService> {
    let response: Response;
    const params = `time_zone=UTC&include[]=integrations&include[]=escalation_policies`;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/services`;

    try {
        response = await fetch(`${baseUrl}/${serviceId}?${params}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to get service. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to get service. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to get service. Caller is not authorized to view the requested resource.", 403);
        case 404:
            throw new HttpError("Failed to get service. The requested resource was not found.", 404);
        default: // 200
            break;
    }

    let result: PagerDutyServiceResponse;
    try {
        result = await response.json();

        return result.service;
    } catch (error) {
        throw new HttpError(`Failed to parse service information: ${error}`, 500);
    }
}

export async function getServiceByIntegrationKey(integrationKey: string): Promise<PagerDutyService> {
    let response: Response;
    const params = `query=${integrationKey}&time_zone=UTC&include[]=integrations&include[]=escalation_policies`;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/services`;

    try {
        response = await fetch(`${baseUrl}?${params}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to get service. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to get service. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to get service. Caller is not authorized to view the requested resource.", 403);
        case 404:
            throw new HttpError("Failed to get service. The requested resource was not found.", 404);
        default: // 200
            break;
    }

    let result: PagerDutyServicesResponse;
    try {
        result = await response.json();
    } catch (error) {
        throw new HttpError(`Failed to parse service information: ${error}`, 500);
    }

    if (result.services.length === 0) {
        throw new HttpError(`Failed to get service. The requested resource was not found.`, 404);
    }

    return result.services[0];
}

export async function getChangeEvents(serviceId: string): Promise<PagerDutyChangeEvent[]> {
    let response: Response;
    const params = `limit=5&time_zone=UTC&sort_by=timestamp`;
    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/services`;

    try {
        response = await fetch(`${baseUrl}/${serviceId}/change_events?${params}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve change events for service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to get change events for service. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to get change events for service. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to get change events for service. Caller is not authorized to view the requested resource.", 403);
        case 404:
            throw new HttpError("Failed to get change events for service. The requested resource was not found.", 404);
        default: // 200
            break;
    }

    let result: PagerDutyChangeEventsResponse;
    try {
        result = await response.json();

        return result.change_events;
    } catch (error) {
        throw new HttpError(`Failed to parse change events information: ${error}`, 500);
    }
}

export async function getIncidents(serviceId: string): Promise<PagerDutyIncident[]> {
    let response: Response;
    const params = `time_zone=UTC&sort_by=created_at&statuses[]=triggered&statuses[]=acknowledged&service_ids[]=${serviceId}`;

    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/incidents`;

    try {
        response = await fetch(`${baseUrl}?${params}`, options);
    } catch (error) {
        throw new Error(`Failed to retrieve incidents for service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to get incidents for service. Caller provided invalid arguments.", 400);
        case 401:
            throw new HttpError("Failed to get incidents for service. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 402:
            throw new HttpError("Failed to get incidents for service. Account does not have the abilities to perform the action. Please review the response for the required abilities.", 402);
        case 403:
            throw new HttpError("Failed to get incidents for service. Caller is not authorized to view the requested resource.", 403);
        case 429:
            throw new HttpError("Failed to get incidents for service. Too many requests have been made, the rate limit has been reached.", 429);
        default: // 200
            break;
    }

    let result: PagerDutyIncidentsResponse;
    try {
        result = await response.json();

        return result.incidents;
    } catch (error) {
        throw new HttpError(`Failed to parse incidents information: ${error}`, 500);
    }
}

export async function getServiceStandards(serviceId: string): Promise<PagerDutyServiceStandards> {
    let response: Response;

    const options: RequestInit = {
        method: 'GET',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
    };
    const baseUrl = `${apiBaseUrl}/standards/scores/technical_services/${serviceId}`;

    try {
        response = await fetch(baseUrl, options);
    } catch (error) {
        throw new Error(`Failed to retrieve service standards for service: ${error}`);
    }

    switch (response.status) {
        case 401:
            throw new HttpError("Failed to get service standards for service. Caller did not supply credentials or did not provide the correct credentials.", 401);
        case 403:
            throw new HttpError("Failed to get service standards for service. Caller is not authorized to view the requested resource.", 403);
        case 429:
            throw new HttpError("Failed to get service standards for service. Too many requests have been made, the rate limit has been reached.", 429);
        default: // 200
            break;
    }

    try {
        const result = await response.json();
        return result;
    } catch (error) {
        throw new HttpError(`Failed to parse service standards information: ${error}`, 500);
    }
}

export async function getServiceMetrics(serviceId: string): Promise<PagerDutyServiceMetrics[]> {
    let response: Response;
    
    const endDate = DateTime.now();
    const startDate = endDate.minus({ days: 30 });
    const body = JSON.stringify({
        filters: {
            created_at_start: startDate.toISO(),
            created_at_end: endDate.toISO(),
            service_ids: [
                serviceId
            ]
        }
    });

    const options: RequestInit = {
        method: 'POST',
        headers: {
            Authorization: await getAuthToken(),
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
        },
        body: body
    };
    const baseUrl = `${apiBaseUrl}/analytics/metrics/incidents/services`;

    try {
        response = await fetch(baseUrl, options);
    } catch (error) {
        throw new Error(`Failed to retrieve service metrics for service: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to get service metrics for service. Caller provided invalid arguments. Please review the response for error details. Retrying with the same arguments will not work.", 400);
        case 429:
            throw new HttpError("Failed to get service metrics for service. Too many requests have been made, the rate limit has been reached.", 429);
        default: // 200
            break;
    }

    try {
        const result = await response.json();

        return result.data;
    } catch (error) {
        throw new HttpError(`Failed to parse service metrics information: ${error}`, 500);
    }
}

