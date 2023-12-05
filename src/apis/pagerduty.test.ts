/* eslint-disable jest/no-conditional-expect */
import { createService, createServiceIntegration } from "./pagerduty";

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
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service integration. Caller provided invalid arguments.");
            }
        });

        it("should NOT create a service integration when correct credentials are not provided", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 401,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service integration. Caller did not supply credentials or did not provide the correct credentials.");
            }
        });

        it("should NOT create a service integration when user is not allowed to view the requested resource", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 403,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service integration. Caller is not authorized to view the requested resource.");
            }
        });

        it("should NOT create a service integration when request rate limit is exceeded", async () => {
            const serviceId = "serviceId";
            const vendorId = "nonExistentVendorId";

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    status: 429,
                    json: () => Promise.resolve({})
                })
            ) as jest.Mock;

            try {
                await createServiceIntegration(serviceId, vendorId);
            } catch (error) {
                expect(((error as Error).message)).toEqual("Failed to create service integration. Rate limit exceeded.");
            }
        });
    });
});

