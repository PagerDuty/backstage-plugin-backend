/* eslint-disable jest/no-conditional-expect */
import { HttpError } from "../types";
import { createService, createServiceIntegration, getAllEscalationPolicies } from "./pagerduty";

describe("PagerDuty API", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createService", () => {
        it("should create a service", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "12345";

            const expectedResponse = ["S3RV1CE1D", "https://testaccount.pagerduty.com/services/S3RV1CE1D"];

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 201,
                    json: () => Promise.resolve({
                        service: {
                            id: expectedResponse[0],
                            htmlUrl: expectedResponse[1],
                        }
                    })
                })
            ) as jest.Mock;

            const result = await createService(name, description, escalationPolicyId);

            expect(result).toEqual(expectedResponse);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("should NOT create a service when caller provides invalid arguments", async () => {
            const name = "TestService";
            const description = "Test Service Description";
            const escalationPolicyId = "";

            global.fetch = jest.fn(() =>
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

            global.fetch = jest.fn(() =>
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

            global.fetch = jest.fn(() =>
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

            global.fetch = jest.fn(() =>
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
});

