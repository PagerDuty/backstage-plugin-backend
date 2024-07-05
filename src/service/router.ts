import { AuthService, DiscoveryService, LoggerService, RootConfigService } from '@backstage/backend-plugin-api';
import { createLegacyAuthAdapters, errorHandler } from '@backstage/backend-common';
import { getAllEscalationPolicies, getChangeEvents, getIncidents, getOncallUsers, getServiceById, getServiceByIntegrationKey, setAPIBaseUrl, getServiceStandards, getServiceMetrics, getAllServices } from '../apis/pagerduty';
import { HttpError, PagerDutyChangeEventsResponse, PagerDutyIncidentsResponse, PagerDutyOnCallUsersResponse, PagerDutyServiceResponse, PagerDutyServiceStandardsResponse, PagerDutyServiceMetricsResponse, PagerDutyServicesResponse, PagerDutyEntityMapping, PagerDutyEntityMappingsResponse, PagerDutyService } from '@pagerduty/backstage-plugin-common';
import { loadAuthConfig } from '../auth/auth';
import { PagerDutyBackendStore, RawDbEntityResultRow } from '../db/PagerDutyBackendDatabase';
import * as express from 'express';
import Router from 'express-promise-router';
import type { CatalogApi, GetEntitiesResponse } from '@backstage/catalog-client';


export interface RouterOptions {
    logger: LoggerService;
    config: RootConfigService;
    store: PagerDutyBackendStore;
    discovery: DiscoveryService;
    auth?: AuthService;
    catalogApi?: CatalogApi;
}

export type Annotations = {
    "pagerduty.com/integration-key": string;
    "pagerduty.com/service-id": string;
}

export async function createComponentEntitiesReferenceDict({ items: componentEntities }: GetEntitiesResponse): Promise<Record<string, { ref: string, name: string }>> {
    const componentEntitiesDict: Record<string, { ref: string, name: string }> = {};

    await Promise.all(componentEntities.map(async (entity) => {
        const annotations: Annotations = JSON.parse(JSON.stringify(entity.metadata.annotations));
        const serviceId = annotations['pagerduty.com/service-id'];
        const integrationKey = annotations['pagerduty.com/integration-key'];

        if (serviceId !== undefined && serviceId !== "") {
            componentEntitiesDict[serviceId] = {
                ref: `${entity.kind}:${entity.metadata.namespace}/${entity.metadata.name}`.toLowerCase(),
                name: entity.metadata.name,
            };
        }
        else if (integrationKey !== undefined && integrationKey !== "") {
            // get service id from integration key
            const service : PagerDutyService = await getServiceByIntegrationKey(integrationKey);

            if (service !== undefined) {
                componentEntitiesDict[service.id] = {
                    ref: `${entity.kind}:${entity.metadata.namespace}/${entity.metadata.name}`.toLowerCase(),
                    name: entity.metadata.name,
                };
            }
        }
    }));

    return componentEntitiesDict;
}

export async function buildEntityMappingsResponse(
    entityMappings: RawDbEntityResultRow[],
    componentEntitiesDict: Record<string, {
        ref: string;
        name: string;
    }>,
    componentEntities: GetEntitiesResponse,
    pagerDutyServices: PagerDutyService[]
    ) : Promise<PagerDutyEntityMappingsResponse> {

    const result: PagerDutyEntityMappingsResponse = {
        mappings: []
    };

    pagerDutyServices.forEach((service) => {
        // Check for service mapping annotation in any entity config file and get the entity ref
        const entityRef = componentEntitiesDict[service.id]?.ref;
        const entityName = componentEntitiesDict[service.id]?.name;

        // Check if the service is mapped to an entity in the database
        const entityMapping = entityMappings.find((mapping) => mapping.serviceId === service.id);

        if (entityMapping) {
            if (entityRef === undefined) {
                if (entityMapping.entityRef === "" || entityMapping.entityRef === undefined) {
                    result.mappings.push({
                        entityRef: "",
                        entityName: "",
                        integrationKey: entityMapping.integrationKey,
                        serviceId: entityMapping.serviceId,
                        status: "NotMapped",
                        serviceName: service.name,
                        team: service.teams?.[0]?.name ?? "",
                        escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                        serviceUrl: service.html_url,
                    });
                }
                else {
                    const entityRefName = componentEntities.items.find((entity) => `${entity.kind}:${entity.metadata.namespace}/${entity.metadata.name}`.toLowerCase() === entityMapping.entityRef)?.metadata.name ?? "";

                    result.mappings.push({
                        entityRef: entityMapping.entityRef,
                        entityName: entityRefName,
                        serviceId: entityMapping.serviceId,
                        integrationKey: entityMapping.integrationKey,
                        status: "OutOfSync",
                        serviceName: service.name,
                        team: service.teams?.[0]?.name ?? "",
                        escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                        serviceUrl: service.html_url,
                    });
                }
            } else if (entityRef !== entityMapping.entityRef) {
                const entityRefName = componentEntities.items.find((entity) => `${entity.kind}:${entity.metadata.namespace}/${entity.metadata.name}`.toLowerCase() === entityMapping.entityRef)?.metadata.name ?? "";

                result.mappings.push({
                    entityRef: entityMapping.entityRef !== "" ? entityMapping.entityRef : "",
                    entityName: entityMapping.entityRef !== "" ? entityRefName : "",
                    serviceId: entityMapping.serviceId,
                    integrationKey: entityMapping.integrationKey,
                    status: "OutOfSync",
                    serviceName: service.name,
                    team: service.teams?.[0]?.name ?? "",
                    escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                    serviceUrl: service.html_url,
                });
            } else if (entityRef === entityMapping.entityRef) {
                result.mappings.push({
                    entityRef: entityMapping.entityRef !== "" ? entityMapping.entityRef : "",
                    entityName: entityMapping.entityRef !== "" ? entityName : "",
                    serviceId: entityMapping.serviceId,
                    integrationKey: entityMapping.integrationKey,
                    status: "InSync",
                    serviceName: service.name,
                    team: service.teams?.[0]?.name ?? "",
                    escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                    serviceUrl: service.html_url,
                });
            }
        } else {
            const backstageVendorId = 'PRO19CT';
            const backstageIntegrationKey = service.integrations?.find((integration) => integration.vendor?.id === backstageVendorId)?.integration_key ?? "";

            if (entityRef !== undefined) {
                result.mappings.push({
                    entityRef: entityRef,
                    entityName: entityName,
                    serviceId: service.id,
                    integrationKey: backstageIntegrationKey,
                    status: "InSync",
                    serviceName: service.name,
                    team: service.teams?.[0]?.name ?? "",
                    escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                    serviceUrl: service.html_url,
                });
            } else {
                result.mappings.push({
                    entityRef: "",
                    entityName: "",
                    serviceId: service.id,
                    integrationKey: backstageIntegrationKey,
                    status: "NotMapped",
                    serviceName: service.name,
                    team: service.teams?.[0]?.name ?? "",
                    escalationPolicy: service.escalation_policy !== undefined ? service.escalation_policy.name : "",
                    serviceUrl: service.html_url,
                });
            }
        }
    });

    const sortedResult = result.mappings.sort((a, b) => {
        if (a.serviceName! < b.serviceName!) { return -1; }
        else if (a.serviceName! > b.serviceName!) { return 1; }
        return 0;
    });

    result.mappings = sortedResult;

    return result;
}

export async function createRouter(
    options: RouterOptions
): Promise<express.Router> {
    const { logger, config, store, catalogApi } = options;
    let { auth } = options;

    if (!auth) {
        auth = createLegacyAuthAdapters(options).auth;
    }

    // Get authentication Config
    await loadAuthConfig(config, logger);

    // Get the PagerDuty API Base URL from config
    const baseUrl = config.getOptionalString('pagerDuty.apiBaseUrl') !== undefined ? config.getString('pagerDuty.apiBaseUrl') : 'https://api.pagerduty.com';
    setAPIBaseUrl(baseUrl);

    // Create the router
    const router = Router();
    router.use(express.json());

    // POST /mapping/entity
    router.post('/mapping/entity', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const entity: PagerDutyEntityMapping = request.body;

            if (!entity.serviceId) {
                response.status(400).json("Bad Request: 'service_id' is required");
            }

            // Get all the entity mappings from the database
            const entityMappings = await store.getAllEntityMappings();
            const oldMapping = entityMappings.find((mapping) => mapping.serviceId === entity.serviceId);

            const entityMappingId = await store.insertEntityMapping(entity);

            // Refresh new and old entity unless they are empty strings
            if (entity.entityRef !== "") {
                // force refresh of new entity
                await catalogApi?.refreshEntity(entity.entityRef);
            }

            if (oldMapping && oldMapping.entityRef !== "") {
                // force refresh of old entity
                await catalogApi?.refreshEntity(oldMapping.entityRef);
            }

            response.json({
                id: entityMappingId,
                entityRef: entity.entityRef,
                integrationKey: entity.integrationKey,
                serviceId: entity.serviceId,
                status: entity.status,
            });
        } catch (error) {
            if (error instanceof HttpError) {
                logger.error(`Error occurred while processing request: ${error.message}`);
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /mapping/entity
    router.get('/mapping/entity', async (_, response) => {
        try {
            // Get all the entity mappings from the database
            const entityMappings = await store.getAllEntityMappings();

            // Get all the entities from the catalog
            const componentEntities = await catalogApi!.getEntities({
                filter: {
                    kind: 'Component',
                }
            });

            // Build reference dictionary of componentEntities with serviceId as the key and entity reference and name pair as the value
            const componentEntitiesDict: Record<string, { ref: string, name: string }> = await createComponentEntitiesReferenceDict(componentEntities);

            // Get all services from PagerDuty
            const pagerDutyServices = await getAllServices();

            // Build the response object
            const result: PagerDutyEntityMappingsResponse = await buildEntityMappingsResponse(entityMappings, componentEntitiesDict, componentEntities, pagerDutyServices);

            response.json(result);
        } catch (error) {
            console.log(error);
            if (error instanceof HttpError) {
                response.status(error.status).json({
                    errors: [
                        `${error.message}`
                    ]
                });
            }
        }
    });

    // GET /mapping/entity
    router.get('/mapping/entity/:type/:namespace/:name', async (request, response) => {
        try {
            // Get the type, namespace and entity name from the request parameters
            const entityType: string = request.params.type || '';
            const entityNamespace: string = request.params.namespace || '';
            const entityName: string = request.params.name || '';


            if (entityType === ''
                || entityNamespace === ''
                || entityName === '') {
                response.status(400).json("Required params not specified.");
                return;
            }

            const entityRef = `${entityType}:${entityNamespace}/${entityName}`.toLowerCase();

            // Get all the entity mappings from the database
            const entityMapping = await store.findEntityMappingByEntityRef(entityRef);

            if (!entityMapping) {
                response.status(404).json(`Mapping for entityRef ${entityRef} not found.`);
                return;
            }

            response.json({
                mapping: entityMapping
            });

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

            if (integrationKey !== '') {
                const service = await getServiceByIntegrationKey(integrationKey);
                const serviceResponse: PagerDutyServiceResponse = {
                    service: service
                }

                response.json(serviceResponse);
            } else {
                const services = await getAllServices();
                const servicesResponse: PagerDutyServicesResponse = {
                    services: services
                }

                response.json(servicesResponse);
            }
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

    // GET /services/:serviceId/standards
    router.get('/services/:serviceId/standards', async (request, response) => {
        try {

            // Get the serviceId from the request parameters
            const serviceId: string = request.params.serviceId || '';

            const serviceStandards = await getServiceStandards(serviceId);
            const serviceStandardsResponse: PagerDutyServiceStandardsResponse = {
                standards: serviceStandards
            }

            response.json(serviceStandardsResponse);
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

    // GET /services/:serviceId/metrics
    router.get('/services/:serviceId/metrics', async (request, response) => {
        try {
            // Get the serviceId from the request parameters
            const serviceId: string = request.params.serviceId || '';

            const metrics = await getServiceMetrics(serviceId);


            const metricsResponse: PagerDutyServiceMetricsResponse = {
                metrics: metrics
            };

            response.json(metricsResponse);

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