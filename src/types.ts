export type PagerDutyCreateServiceResponse = {
    service: PagerDutyService;
};

export type PagerDutyService = {
    id: string;
    name: string;
    description: string;
    escalationPolicy: PagerDutyEscalationPolicy;
    alertCreation: string;
    incidentUrgencyRule: PagerDutyIncidentUrgencyRule;
    integrations: PagerDutyIntegrations[];
    teams: PagerDutyTeam[];
    status: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
};

export type PagerDutyTeam = {
    id: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
};

export type PagerDutyEscalationPolicy = {
    id: string;
    name: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
};

export type PagerDutyIncidentUrgencyRule = {
    type: string;
    urgency: string;
};

export type PagerDutyIntegrations = {
    id: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
};

export type PagerDutyCreateIntegrationResponse = {
    integration: PagerDutyIntegration;
};

export type PagerDutyIntegration = {
    id: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
    name: string;
    service: PagerDutyService;
    createdAt: string;
    vendor: PagerDutyVendor;
    integration_key: string;
};

export type PagerDutyVendor = {
    id: string;
    type: string;
    summary: string;
    self: string;
    htmlUrl: string;
};

export type PagerDutyEscalationPolicyListResponse = {
    escalation_policies: PagerDutyEscalationPolicy[];
    limit: number;
    offset: number;
    more: boolean;
    total: number;
};

export type PagerDutyEscalationPolicyDropDownOption = {
    label: string;
    value: string;
};

export class HttpError extends Error {
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }

    status: number;
}

export type PagerDutyAbilitiesListResponse = {
    abilities: string[];
};


export type CreateServiceResponse = {
    id: string;
    url: string;
    alertGrouping: string;
};
