/* eslint-disable jest/no-conditional-expect */
import { HttpError, PagerDutyChangeEvent, PagerDutyService } from "@pagerduty/backstage-plugin-common";
import { createService, createServiceIntegration, getAllEscalationPolicies, getChangeEvents, getOncallUsers, getServiceById, getServiceByIntegrationKey } from "./pagerduty";

describe("PagerDuty API", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createService", () => {
        it("should create a service without event grouping when AIOps is not available", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            const expectedResponse = { "alertGrouping": "null", "id": "S3RV1CE1D", "url": "https://testaccount.pagerduty.com/services/S3RV1CE1D" };

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        service: {
                            id: "S3RV1CE1D",
                            html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                        }
                    })
                })
            ) as jest.Mock;

            const result = await createService(name, description, escalationPolicyId, "intelligent");

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it("should create a service without event grouping when grouping is 'null'", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            const expectedResponse = { "alertGrouping": "null", "id": "S3RV1CE1D", "url": "https://testaccount.pagerduty.com/services/S3RV1CE1D" };

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        service: {
                            id: "S3RV1CE1D",
                            html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                        }
                    })
                })
            ) as jest.Mock;

            const result = await createService(name, description, escalationPolicyId, "null");

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it("should create a service without event grouping when grouping is undefined", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            const expectedResponse = { "alertGrouping": "null", "id": "S3RV1CE1D", "url": "https://testaccount.pagerduty.com/services/S3RV1CE1D" };

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        service: {
                            id: "S3RV1CE1D",
                            html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                        }
                    })
                })
            ) as jest.Mock;

            const result = await createService(name, description, escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it("should create a service", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            const expectedResponse = { "alertGrouping": "null", "id": "S3RV1CE1D", "url": "https://testaccount.pagerduty.com/services/S3RV1CE1D" };

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        service: {
                            id: "S3RV1CE1D",
                            html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                        }
                    })
                })
            ) as jest.Mock;

            const result = await createService(name, description, escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it("should NOT create a service when caller provides invalid arguments", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "";

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 400,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createService(name, description, escalationPolicyId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service. Caller provided invalid arguments.");
            }
        });

        it("should NOT create a service when correct credentials are not provided", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "";

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 401,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createService(name, description, escalationPolicyId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service. Caller did not supply credentials or did not provide the correct credentials.");
            }
        });

        it("should NOT create a service when account does not have abilities to perform the action", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 402,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createService(name, description, escalationPolicyId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service. Account does not have the abilities to perform the action.");
            }
        });

        it("should NOT create a service when user is not allowed to view the requested resource", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        abilities: [
                            "preview_intelligent_alert_grouping",
                            "time_based_alert_grouping"
                        ]
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 403,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createService(name, description, escalationPolicyId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service. Caller is not authorized to view the requested resource.");
            }
        });
    });

    describe("createServiceIntegration", () => {
        it("should create a service integration", async () => {
            const serviceId = "serviceId";
            const vendorId = "vendorId";

            const expectedResponse = "integrationId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        integration: {
                            integration_key: expectedResponse,
                        }
                    })
                })
            ) as jest.Mock;


            const result = await createServiceIntegration(serviceId, vendorId);

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should NOT create a service integration when caller provides invalid arguments", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 400,
                })
            ) as jest.Mock;

            const expectedErrorMessage = "Failed to create service integration. Caller provided invalid arguments.";

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT create a service integration when correct credentials are not provided", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 401
                })
            ) as jest.Mock;

            const expectedErrorMessage = "Failed to create service integration. Caller did not supply credentials or did not provide the correct credentials.";

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT create a service integration when user is not allowed to view the requested resource", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 403
                })
            ) as jest.Mock;

            const expectedErrorMessage = "Failed to create service integration. Caller is not authorized to view the requested resource.";

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT create a service integration when request rate limit is exceeded", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 429
                })
            ) as jest.Mock;

            const expectedErrorMessage = "Failed to create service integration. Rate limit exceeded.";

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual(expectedErrorMessage);
            }
        });
    });

    describe("getAllEscalationPolicies", () => {
        it("should return ok", async () => {
            const expectedId = "P0L1CY1D";
            const expectedName = "Test Escalation Policy";

            const expectedResponse = [
                {
                    id: expectedId,
                    name: expectedName
                }
            ];

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId,
                                name: expectedName,
                            }
                        ]
                    })
                })
            ) as jest.Mock;

            const result = await getAllEscalationPolicies();

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(1);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should NOT list escalation policies when caller provides invalid arguments", async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 400,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            const expectedStatusCode = 400;
            const expectedErrorMessage = "Failed to list escalation policies. Caller provided invalid arguments.";

            try {
                await getAllEscalationPolicies();
            } catch (error) {
                expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT list escalation policies when correct credentials are not provided", async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 401
                })
            ) as jest.Mock;

            const expectedStatusCode = 401;
            const expectedErrorMessage = "Failed to list escalation policies. Caller did not supply credentials or did not provide the correct credentials.";

            try {
                await getAllEscalationPolicies();
            } catch (error) {
                expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT list escalation policies when account does not have abilities to perform the action", async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 403
                })
            ) as jest.Mock;

            const expectedStatusCode = 403;
            const expectedErrorMessage = "Failed to list escalation policies. Caller is not authorized to view the requested resource.";

            try {
                await getAllEscalationPolicies();
            } catch (error) {
                expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should NOT list escalation policies when user is not allowed to view the requested resource", async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 429
                })
            ) as jest.Mock;

            const expectedStatusCode = 429;
            const expectedErrorMessage = "Failed to list escalation policies. Rate limit exceeded.";

            try {
                await getAllEscalationPolicies();
            } catch (error) {
                expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
            }
        });

        it("should work with pagination", async () => {
            const expectedId = ["P0L1CY1D1", "P0L1CY1D2", "P0L1CY1D3", "P0L1CY1D4", "P0L1CY1D5", "P0L1CY1D6", "P0L1CY1D7", "P0L1CY1D8", "P0L1CY1D9", "P0L1CY1D10"];
            const expectedName = ["Test Escalation Policy 1", "Test Escalation Policy 2", "Test Escalation Policy 3", "Test Escalation Policy 4", "Test Escalation Policy 5", "Test Escalation Policy 6", "Test Escalation Policy 7", "Test Escalation Policy 8", "Test Escalation Policy 9", "Test Escalation Policy 10"];

            const expectedResponse = [
                {
                    id: expectedId[0],
                    name: expectedName[0]
                },
                {
                    id: expectedId[1],
                    name: expectedName[1]
                },
                {
                    id: expectedId[2],
                    name: expectedName[2]
                },
                {
                    id: expectedId[3],
                    name: expectedName[3]
                },
                {
                    id: expectedId[4],
                    name: expectedName[4]
                },
                {
                    id: expectedId[5],
                    name: expectedName[5]
                },
                {
                    id: expectedId[6],
                    name: expectedName[6]
                },
                {
                    id: expectedId[7],
                    name: expectedName[7]
                },
                {
                    id: expectedId[8],
                    name: expectedName[8]
                },
                {
                    id: expectedId[9],
                    name: expectedName[9]
                }
            ];

            global.fetch = jest.fn().mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId[0],
                                name: expectedName[0],
                            },
                            {
                                id: expectedId[1],
                                name: expectedName[1],
                            }
                        ],
                        more: true
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId[2],
                                name: expectedName[2],
                            },
                            {
                                id: expectedId[3],
                                name: expectedName[3],
                            }
                        ],
                        more: true
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId[4],
                                name: expectedName[4],
                            },
                            {
                                id: expectedId[5],
                                name: expectedName[5],
                            }
                        ],
                        more: true
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId[6],
                                name: expectedName[6],
                            },
                            {
                                id: expectedId[7],
                                name: expectedName[7],
                            }
                        ],
                        more: true
                    })
                })
            ).mockReturnValueOnce(
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve({
                        escalation_policies: [
                            {
                                id: expectedId[8],
                                name: expectedName[8],
                            },
                            {
                                id: expectedId[9],
                                name: expectedName[9],
                            }
                        ],
                        more: false
                    })
                })
            ) as jest.Mock;

            const result = await getAllEscalationPolicies();

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(10);
            expect(fetch).toHaveBeenCalledTimes(5);
        });
    });

    describe("getOncallUsers", () => {
        it("should return list of users ordered by name ASC from escalation policy level 1", async () => {
            const escalationPolicyId = "12345";
            const expectedResponse = [
                {
                    id: "userId2",
                    name: "Jane Doe",
                    email: "jane.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "Jane Doe",
                },
                {
                    id: "userId1",
                    name: "John Doe",
                    email: "john.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "John Doe",
                }
            ];

            const mockAPIResponse = {
                "oncalls": [
                    {
                        "user": {
                            "id": expectedResponse[0].id,
                            "summary": expectedResponse[0].summary,
                            "name": expectedResponse[0].name,
                            "email": expectedResponse[0].email,
                            "avatar_url": expectedResponse[0].avatar_url,
                            "html_url": expectedResponse[0].html_url,
                        },
                        "escalation_level": 1
                    },
                    {
                        "user": {
                            "id": expectedResponse[1].id,
                            "summary": expectedResponse[1].summary,
                            "name": expectedResponse[1].name,
                            "email": expectedResponse[1].email,
                            "avatar_url": expectedResponse[1].avatar_url,
                            "html_url": expectedResponse[1].html_url,
                        },
                        "escalation_level": 1
                    },
                    {
                        "user": {
                            "id": "userId3",
                            "summary": "James Doe",
                            "name": "James Doe",
                            "email": "james.does@email.com",
                            "avatar_url": "https://example.pagerduty.com/avatars/123",
                            "html_url": "https://example.pagerduty.com/users/123",
                        },
                        "escalation_level": 2
                    }
                ]
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(mockAPIResponse)
                })
            ) as jest.Mock;

            const result = await getOncallUsers(escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(2);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should return single user from escalation policy level 1", async () => {
            const escalationPolicyId = "12345";
            const expectedResponse = [
                {
                    id: "userId1",
                    name: "John Doe",
                    email: "john.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "John Doe",
                }
            ];

            const mockAPIResponse = {
                "oncalls": [
                    {
                        "user": {
                            "id": expectedResponse[0].id,
                            "summary": expectedResponse[0].summary,
                            "name": expectedResponse[0].name,
                            "email": expectedResponse[0].email,
                            "avatar_url": expectedResponse[0].avatar_url,
                            "html_url": expectedResponse[0].html_url,
                        },
                        "escalation_level": 1
                    },
                    {
                        "user": {
                            "id": "userId2",
                            "summary": "James Doe",
                            "name": "James Doe",
                            "email": "james.does@email.com",
                            "avatar_url": "https://example.pagerduty.com/avatars/123",
                            "html_url": "https://example.pagerduty.com/users/123",
                        },
                        "escalation_level": 2
                    }
                ]
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(mockAPIResponse)
                })
            ) as jest.Mock;

            const result = await getOncallUsers(escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(1);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should return list of users ordered by name ASC from other escalation levels when level 1 is empty", async () => {
            const escalationPolicyId = "12345";
            const expectedResponse = [
                {
                    id: "userId2",
                    name: "Jane Doe",
                    email: "jane.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "Jane Doe",
                },
                {
                    id: "userId1",
                    name: "John Doe",
                    email: "john.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "John Doe",
                }
            ];

            const mockAPIResponse = {
                "oncalls": [
                    {
                        "user": {
                            "id": expectedResponse[0].id,
                            "summary": expectedResponse[0].summary,
                            "name": expectedResponse[0].name,
                            "email": expectedResponse[0].email,
                            "avatar_url": expectedResponse[0].avatar_url,
                            "html_url": expectedResponse[0].html_url,
                        },
                        "escalation_level": 2
                    },
                    {
                        "user": {
                            "id": expectedResponse[1].id,
                            "summary": expectedResponse[1].summary,
                            "name": expectedResponse[1].name,
                            "email": expectedResponse[1].email,
                            "avatar_url": expectedResponse[1].avatar_url,
                            "html_url": expectedResponse[1].html_url,
                        },
                        "escalation_level": 2
                    },
                    {
                        "user": {
                            "id": "userId3",
                            "summary": "James Doe",
                            "name": "James Doe",
                            "email": "james.does@email.com",
                            "avatar_url": "https://example.pagerduty.com/avatars/123",
                            "html_url": "https://example.pagerduty.com/users/123",
                        },
                        "escalation_level": 3
                    }
                ]
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(mockAPIResponse)
                })
            ) as jest.Mock;

            const result = await getOncallUsers(escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(2);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should return list of users ordered by name ASC without duplicates", async () => {
            const escalationPolicyId = "12345";
            const expectedResponse = [
                {
                    id: "userId2",
                    name: "Jane Doe",
                    email: "jane.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "Jane Doe",
                },
                {
                    id: "userId1",
                    name: "John Doe",
                    email: "john.doe@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                    summary: "John Doe",
                }
            ];

            const mockAPIResponse = {
                "oncalls": [
                    {
                        "user": {
                            "id": expectedResponse[0].id,
                            "summary": expectedResponse[0].summary,
                            "name": expectedResponse[0].name,
                            "email": expectedResponse[0].email,
                            "avatar_url": expectedResponse[0].avatar_url,
                            "html_url": expectedResponse[0].html_url,
                        },
                        "escalation_level": 1
                    },
                    {
                        "user": {
                            "id": expectedResponse[1].id,
                            "summary": expectedResponse[1].summary,
                            "name": expectedResponse[1].name,
                            "email": expectedResponse[1].email,
                            "avatar_url": expectedResponse[1].avatar_url,
                            "html_url": expectedResponse[1].html_url,
                        },
                        "escalation_level": 1
                    },
                    {
                        "user": {
                            "id": expectedResponse[0].id,
                            "summary": expectedResponse[0].summary,
                            "name": expectedResponse[0].name,
                            "email": expectedResponse[0].email,
                            "avatar_url": expectedResponse[0].avatar_url,
                            "html_url": expectedResponse[0].html_url,
                        },
                        "escalation_level": 1
                    }
                ]
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(mockAPIResponse)
                })
            ) as jest.Mock;

            const result = await getOncallUsers(escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(result.length).toEqual(2);
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe("getServices", () => {
        describe("getServicesByIntegrationKey", () => {
            it("should return service when 'integration_key' is provided", async () => {
                const integrationKey = "INT3GR4T10N_K3Y";
                const expectedResponse: PagerDutyService = {
                    id: "S3RV1CE1D",
                    name: "Test Service",
                    description: "Test Service Description",
                    html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                    escalation_policy: {
                        id: "P0L1CY1D",
                        name: "Test Escalation Policy",
                        html_url: "https://testaccount.pagerduty.com/escalation_policies/P0L1CY1D",
                        type: "escalation_policy_reference",
                    },
                    status: "active",
                };

                const mockAPIResponse = {
                    "services": [
                        {
                            "id": expectedResponse.id,
                            "name": expectedResponse.name,
                            "description": expectedResponse.description,
                            "status": expectedResponse.status,
                            "escalation_policy": {
                                "id": expectedResponse.escalation_policy.id,
                                "name": expectedResponse.escalation_policy.name,
                                "type": expectedResponse.escalation_policy.type,
                                "html_url": expectedResponse.escalation_policy.html_url
                            },
                            "html_url": expectedResponse.html_url
                        }
                    ],
                    "limit": 25,
                    "offset": 0,
                    "total": null,
                    "more": false
                };

                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 200,
                        json: () => Promise.resolve(mockAPIResponse)
                    })
                ) as jest.Mock;

                const result = await getServiceByIntegrationKey(integrationKey);

                expect(result).toEqual(expectedResponse);
                expect(fetch).toHaveBeenCalledTimes(1);
            });

            it("should NOT get service when caller provides invalid arguments", async () => {
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 400,
                        json: () => Promise.resolve({})
                    })
                ) as jest.Mock;

                const integrationKey = "INT3GR4T10N_K3Y";
                const expectedStatusCode = 400;
                const expectedErrorMessage = "Failed to get service. Caller provided invalid arguments.";

                try {
                    await getServiceByIntegrationKey(integrationKey);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });

            it("should NOT get service when correct credentials are not provided", async () => {
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 401
                    })
                ) as jest.Mock;

                const integrationKey = "INT3GR4T10N_K3Y";
                const expectedStatusCode = 401;
                const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

                try {
                    await getServiceByIntegrationKey(integrationKey);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });
        });
        
        describe("getServicesById", () => {
            it("should return service when 'service_id' is provided", async () => {
                const serviceId = "SERV1C31D";
                const expectedResponse: PagerDutyService = {
                    id: "S3RV1CE1D",
                    name: "Test Service",
                    description: "Test Service Description",
                    html_url: "https://testaccount.pagerduty.com/services/S3RV1CE1D",
                    escalation_policy: {
                        id: "P0L1CY1D",
                        name: "Test Escalation Policy",
                        html_url: "https://testaccount.pagerduty.com/escalation_policies/P0L1CY1D",
                        type: "escalation_policy_reference",
                    },
                    status: "active",
                };

                const mockAPIResponse = {
                    "service":
                    {
                        "id": expectedResponse.id,
                        "name": expectedResponse.name,
                        "description": expectedResponse.description,
                        "status": expectedResponse.status,
                        "escalation_policy": {
                            "id": expectedResponse.escalation_policy.id,
                            "name": expectedResponse.escalation_policy.name,
                            "type": expectedResponse.escalation_policy.type,
                            "html_url": expectedResponse.escalation_policy.html_url
                        },
                        "html_url": expectedResponse.html_url
                    }
                };

                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 200,
                        json: () => Promise.resolve(mockAPIResponse)
                    })
                ) as jest.Mock;

                const result = await getServiceById(serviceId);

                expect(result).toEqual(expectedResponse);
                expect(fetch).toHaveBeenCalledTimes(1);
            });

            it("should NOT get service when caller provides invalid arguments", async () => {
                const serviceId = "SERV1C31D";
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 400,
                        json: () => Promise.resolve({})
                    })
                ) as jest.Mock;

                const expectedStatusCode = 400;
                const expectedErrorMessage = "Failed to get service. Caller provided invalid arguments.";

                try {
                    await getServiceById(serviceId);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });

            it("should NOT get service when correct credentials are not provided", async () => {
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 401
                    })
                ) as jest.Mock;

                const serviceId = "SERV1C31D";
                const expectedStatusCode = 401;
                const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

                try {
                    await getServiceById(serviceId);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });
        });

        describe("getChangeEvents", () => {
            it("should return change events list", async () => {
                const serviceId = "SERV1C31D";
                const expectedResponse: PagerDutyChangeEvent[] = [
                    {
                        id: "CH4NG3_3V3NT_1D",
                        source: "GitHub",
                        summary: "Test Change Event 1",
                        timestamp: "2020-01-01T00:00:00Z",
                        links: [
                            {
                                href: "https://example.pagerduty.com/change_events/CH4NG3_3V3NT_1D",
                                text: "View in PagerDuty",
                            },
                        ],
                        integration: [
                            {
                                id: "INT3GR4T10N_1D",
                                summary: "Test Integration 1",
                                type: "github",
                                html_url: "https://example.pagerduty.com/integrations/INT3GR4T10N_1D",
                            }
                        ]                       
                    },
                    {
                        id: "CH4NG3_3V3NT_2D",
                        source: "GitHub",
                        summary: "Test Change Event 2",
                        timestamp: "2020-01-01T10:00:00Z",
                        links: [
                            {
                                href: "https://example.pagerduty.com/change_events/CH4NG3_3V3NT_2D",
                                text: "View in PagerDuty",
                            },
                        ],
                        integration: [
                            {
                                id: "INT3GR4T10N_2D",
                                summary: "Test Integration 2",
                                type: "github",
                                html_url: "https://example.pagerduty.com/integrations/INT3GR4T10N_2D",
                            }
                        ]
                    }
                ];

                const mockAPIResponse = {
                    "change_events": [
                        {
                            "id": expectedResponse[0].id,
                            "source": expectedResponse[0].source,
                            "summary": expectedResponse[0].summary,
                            "timestamp": expectedResponse[0].timestamp,
                            "links": [
                                {
                                    "href": expectedResponse[0].links[0].href,
                                    "text": expectedResponse[0].links[0].text,
                                }
                            ],
                            "integration": [
                                {
                                    "id": expectedResponse[0].integration[0].id,
                                    "summary": expectedResponse[0].integration[0].summary,
                                    "type": expectedResponse[0].integration[0].type,
                                    "html_url": expectedResponse[0].integration[0].html_url,
                                }
                            ]
                        },
                        {
                            "id": expectedResponse[1].id,
                            "source": expectedResponse[1].source,
                            "summary": expectedResponse[1].summary,
                            "timestamp": expectedResponse[1].timestamp,
                            "links": [
                                {
                                    "href": expectedResponse[1].links[0].href,
                                    "text": expectedResponse[1].links[0].text,
                                }
                            ],
                            "integration": [
                                {
                                    "id": expectedResponse[1].integration[0].id,
                                    "summary": expectedResponse[1].integration[0].summary,
                                    "type": expectedResponse[1].integration[0].type,
                                    "html_url": expectedResponse[1].integration[0].html_url,
                                }
                            ]
                        }
                    ]
                };

                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 200,
                        json: () => Promise.resolve(mockAPIResponse)
                    })
                ) as jest.Mock;

                const result = await getChangeEvents(serviceId);

                expect(result).toEqual(expectedResponse);
                expect(fetch).toHaveBeenCalledTimes(1);
            });

            it("should NOT get change events when caller provides invalid arguments", async () => {
                const serviceId = "SERV1C31D";
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 400,
                        json: () => Promise.resolve({})
                    })
                ) as jest.Mock;

                const expectedStatusCode = 400;
                const expectedErrorMessage = "Failed to get change events for service. Caller provided invalid arguments.";

                try {
                    await getChangeEvents(serviceId);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });

            it("should NOT get service when correct credentials are not provided", async () => {
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        status: 401
                    })
                ) as jest.Mock;

                const serviceId = "SERV1C31D";
                const expectedStatusCode = 401;
                const expectedErrorMessage = "Failed to get change events for service. Caller did not supply credentials or did not provide the correct credentials.";

                try {
                    await getChangeEvents(serviceId);
                } catch (error) {
                    expect(((error as HttpError).status)).toEqual(expectedStatusCode);
                    expect(((error as HttpError).message)).toEqual(expectedErrorMessage);
                }
            });
        });
    });
});

