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