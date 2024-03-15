import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { PagerDutyEscalationPolicy, PagerDutyService, PagerDutyServiceResponse, PagerDutyOnCallUsersResponse, PagerDutyChangeEventsResponse, PagerDutyChangeEvent, PagerDutyIncidentsResponse, PagerDutyIncident } from '@pagerduty/backstage-plugin-common';

import { mocked } from "jest-mock";
import fetch, { Response } from "node-fetch";

jest.mock("node-fetch");

jest.mock("../auth/auth", () => ({
  getAuthToken: jest.fn().mockReturnValue(Promise.resolve('test-token')),
  loadAuthConfig: jest.fn().mockReturnValue(Promise.resolve()),
}));

const testInputs = [
  "apiToken",
  "oauth",
];

function mockedResponse(status: number, body: any): Promise<Response> {
  return Promise.resolve({
    json: () => Promise.resolve(body),
    status
  } as Response);
}

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter(
      {
        logger: getVoidLogger(),
        config: new ConfigReader({
          app: {
            baseUrl: 'https://example.com/extra-path',
          },
          pagerDuty: {
            apiToken: 'test-token',
            oauth: {
              clientId: 'test-client-id',
              clientSecret: 'test-client',
              subDomain: 'test-subdomain',
              region: 'EU',
            }
          },
        }),
      }
    );
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /escalation_policies', () => {
    it.each(testInputs)('returns ok', async () => {
      mocked(fetch).mockReturnValue(mockedResponse(200, {
            escalation_policies: [
              {
                id: "12345",
                name: "Test Escalation Policy",
                type: "escalation_policy",
                summary: "Test Escalation Policy",
                self: "https://api.pagerduty.com/escalation_policies/12345",
                html_url: "https://example.pagerduty.com/escalation_policies/12345",
              }
            ]
          })
      );

      const expectedStatusCode = 200;
      const expectedResponse = [
        {
          label: "Test Escalation Policy",
          value: "12345",
        }
      ];

      const response = await request(app).get('/escalation_policies');

      const policies: PagerDutyEscalationPolicy[] = JSON.parse(response.text);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.body).toEqual(expectedResponse);
      expect(policies.length).toEqual(1);
    });

    it.each(testInputs)('returns unauthorized', async () => {
      mocked(fetch).mockReturnValue(mockedResponse(401, {}));

      const expectedStatusCode = 401;
      const expectedErrorMessage = "Failed to list escalation policies. Caller did not supply credentials or did not provide the correct credentials.";

      const response = await request(app).get('/escalation_policies');

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.text).toMatch(expectedErrorMessage);
    });

    it.each(testInputs)('returns empty list when no escalation policies exist', async () => {
      mocked(fetch).mockReturnValue(mockedResponse(200, { escalation_policies: [] }));

      const expectedStatusCode = 200;
      const expectedResponse: PagerDutyEscalationPolicy[] = [];

      const response = await request(app).get('/escalation_policies');

      const policies: PagerDutyEscalationPolicy[] = JSON.parse(response.text);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.body).toEqual(expectedResponse);
      expect(policies.length).toEqual(0);
    });
  });

  describe('GET /oncall-users', () => {
    it.each(testInputs)('returns ok', async () => {
      const escalationPolicyId = "12345";
      const expectedStatusCode = 200;
      const expectedResponse: PagerDutyOnCallUsersResponse = {
        users:
          [
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
          ]
      };

      mocked(fetch).mockReturnValue(mockedResponse(200, {
            "oncalls": [
              {
                "user": {
                  "id": expectedResponse.users[0].id,
                  "summary": expectedResponse.users[0].summary,
                  "name": expectedResponse.users[0].name,
                  "email": expectedResponse.users[0].email,
                  "avatar_url": expectedResponse.users[0].avatar_url,
                  "html_url": expectedResponse.users[0].html_url,
                },
                "escalation_level": 1
              },
              {
                "user": {
                  "id": expectedResponse.users[1].id,
                  "summary": expectedResponse.users[1].summary,
                  "name": expectedResponse.users[1].name,
                  "email": expectedResponse.users[1].email,
                  "avatar_url": expectedResponse.users[1].avatar_url,
                  "html_url": expectedResponse.users[1].html_url,
                },
                "escalation_level": 1
              }
            ]
          })
      );

      const response = await request(app).get(`/oncall-users?escalation_policy_ids[]=${escalationPolicyId}`);

      const oncallUsersResponse: PagerDutyOnCallUsersResponse = JSON.parse(response.text);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.body).toEqual(expectedResponse);
      expect(oncallUsersResponse.users.length).toEqual(2);
    });

    it.each(testInputs)('returns unauthorized', async () => {
      mocked(fetch).mockReturnValue(mockedResponse(401, {}));
      
      const escalationPolicyId = "12345";
      const expectedStatusCode = 401;
      const expectedErrorMessage = "Failed to list oncalls. Caller did not supply credentials or did not provide the correct credentials.";

      const response = await request(app).get(`/oncall-users?escalation_policy_ids[]=${escalationPolicyId}`);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.text).toMatch(expectedErrorMessage);
    });

    it.each(testInputs)('returns empty list when no escalation policies exist', async () => {
      mocked(fetch).mockReturnValue(mockedResponse(200, { "oncalls": [] }));
      
      const escalationPolicyId = "12345";
      const expectedStatusCode = 200;
      const expectedResponse: PagerDutyOnCallUsersResponse = {
        "users": []
      };

      const response = await request(app).get(`/oncall-users?escalation_policy_ids[]=${escalationPolicyId}`);

      const oncallUsersResponse: PagerDutyOnCallUsersResponse = JSON.parse(response.text);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.body).toEqual(expectedResponse);
      expect(oncallUsersResponse.users.length).toEqual(0);
    });
  });

  describe('GET /services', () => {
    describe('with integration key', () => {
      it.each(testInputs)('returns ok', async () => {
        const integrationKey = "INT3GR4T10NK3Y";
        const expectedStatusCode = 200;
        const expectedResponse: PagerDutyServiceResponse = {
          service: {
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
          }
        };

        mocked(fetch).mockReturnValue(mockedResponse(200, {
              "services": [
                {
                  "id": expectedResponse.service.id,
                  "name": expectedResponse.service.name,
                  "description": expectedResponse.service.description,
                  "status": expectedResponse.service.status,
                  "escalation_policy": {
                    "id": expectedResponse.service.escalation_policy.id,
                    "name": expectedResponse.service.escalation_policy.name,
                    "type": expectedResponse.service.escalation_policy.type,
                    "html_url": expectedResponse.service.escalation_policy.html_url
                  },
                  "html_url": expectedResponse.service.html_url
                }
              ],
              "limit": 25,
              "offset": 0,
              "total": null,
              "more": false
            })
        );

        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        const service: PagerDutyService = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(service).toEqual(expectedResponse);

      });

      it.each(testInputs)('returns unauthorized', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(401, {}));
        
        const integrationKey = "INT3GR4T10NK3Y";
        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it.each(testInputs)('returns NOT FOUND when integration key does not belong to a service', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(200, {
                "services": [],
                "limit": 25,
                "offset": 0,
                "total": null,
                "more": false
              }
            )
        );

        const integrationKey = "INT3GR4T10NK3Y";
        const expectedStatusCode = 404;
        const expectedResponse = { "errors": ["Failed to get service. The requested resource was not found."] };

        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);

      });
    });

    describe('with service id', () => {
      it.each(testInputs)('returns ok', async () => {
        const serviceId = "SERV1C31D";
        const expectedStatusCode = 200;
        const expectedResponse: PagerDutyServiceResponse = {
          service: {
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
          }
        };

        mocked(fetch).mockReturnValue(mockedResponse(200, {
              "service":
              {
                "id": expectedResponse.service.id,
                "name": expectedResponse.service.name,
                "description": expectedResponse.service.description,
                "status": expectedResponse.service.status,
                "escalation_policy": {
                  "id": expectedResponse.service.escalation_policy.id,
                  "name": expectedResponse.service.escalation_policy.name,
                  "type": expectedResponse.service.escalation_policy.type,
                  "html_url": expectedResponse.service.escalation_policy.html_url
                },
                "html_url": expectedResponse.service.html_url
              }
            })
        );

        const response = await request(app).get(`/services/${serviceId}`);

        const service: PagerDutyService = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(service).toEqual(expectedResponse);
      });

      it.each(testInputs)('returns unauthorized', async () => {
        const serviceId = "SERV1C31D";
        mocked(fetch).mockReturnValue(mockedResponse(401, {}));

        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it.each(testInputs)('returns NOT FOUND if service id does not exist', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(404, {
                "error": {
                  "message": "Not Found",
                  "code": 2100
                }
              }
            )
        );
        
        const serviceId = "SERV1C31D";
        const expectedStatusCode = 404;
        const expectedResponse = {"errors": ["Failed to get service. The requested resource was not found."]};

        const response = await request(app).get(`/services/${serviceId}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);
      });
    });

    describe('change-events', () => {
      it.each(testInputs)('returns ok', async () => {
        const serviceId = "SERV1C31D";
        const expectedStatusCode = 200;
        const expectedResponse: PagerDutyChangeEventsResponse = {
          change_events: [
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
            }
          ]
        };

        mocked(fetch).mockReturnValue(mockedResponse(200, {
              "change_events": [
                {
                  "id": expectedResponse.change_events[0].id,
                  "source": expectedResponse.change_events[0].source,
                  "summary": expectedResponse.change_events[0].summary,
                  "timestamp": expectedResponse.change_events[0].timestamp,
                  "links": [
                    {
                      "href": expectedResponse.change_events[0].links[0].href,
                      "text": expectedResponse.change_events[0].links[0].text,
                    }
                  ],
                  "integration": [
                    {
                      "id": expectedResponse.change_events[0].integration[0].id,
                      "summary": expectedResponse.change_events[0].integration[0].summary,
                      "type": expectedResponse.change_events[0].integration[0].type,
                      "html_url": expectedResponse.change_events[0].integration[0].html_url,
                    }
                  ]
                }
              ]
          })
        );

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        const changeEvents: PagerDutyChangeEvent[] = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(changeEvents).toEqual(expectedResponse);
      });

      it.each(testInputs)('returns unauthorized', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(401, {}));

        const serviceId = "SERV1C31D";
        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get change events for service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it.each(testInputs)('returns NOT FOUND if service id does not exist', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(404, { "error": { "message": "Not Found", "code": 2100 } }));

        const serviceId = "SERV1C31D";
        const expectedStatusCode = 404;
        const expectedResponse = { "errors": ["Failed to get change events for service. The requested resource was not found."] };

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);
      });
    });

    describe('incidents', () => {
      it.each(testInputs)('returns ok', async () => {
        const serviceId = "SERV1C31D";
        const expectedStatusCode = 200;
        const expectedResponse: PagerDutyIncidentsResponse = {
          incidents: [
            {
              id: "1NC1D3NT_1D",
              status: "triggered",
              title: "Test Incident 1",
              created_at: "2020-01-01T00:00:00Z",
              html_url: "https://example.pagerduty.com/incidents/1NC1D3NT_1D",
              service: {
                id: "S3RV1CE1D",
                name: "Test Service",
                html_url: "https://example.pagerduty.com/services/S3RV1CE1D",
                escalation_policy: {
                  id: "P0L1CY1D",
                  name: "Test Escalation Policy",
                  html_url: "https://example.pagerduty.com/escalation_policies/P0L1CY1D",
                  type: "escalation_policy_reference",
                },
              },
              assignments: [
                {
                  assignee: {
                    id: "4SS1GN33_1D",
                    summary: "Test User",
                    name: "Test User",
                    email: "test.user@email.com",
                    avatar_url: "https://example.pagerduty.com/avatars/123",
                    html_url: "https://example.pagerduty.com/users/123",
                  }
                }
              ]
            }
          ]
        };

        mocked(fetch).mockReturnValue(mockedResponse(200, {
              "incidents": [
                {
                  id: expectedResponse.incidents[0].id,
                  status: expectedResponse.incidents[0].status,
                  title: expectedResponse.incidents[0].title,
                  created_at: expectedResponse.incidents[0].created_at,
                  html_url: expectedResponse.incidents[0].html_url,
                  service: {
                    id: expectedResponse.incidents[0].service.id,
                    name: expectedResponse.incidents[0].service.name,
                    html_url: expectedResponse.incidents[0].service.html_url,
                    escalation_policy: {
                      id: expectedResponse.incidents[0].service.escalation_policy.id,
                      name: expectedResponse.incidents[0].service.escalation_policy.name,
                      html_url: expectedResponse.incidents[0].service.escalation_policy.html_url,
                      type: expectedResponse.incidents[0].service.escalation_policy.type,
                    },
                  },
                  assignments: [
                    {
                      assignee: {
                        id: expectedResponse.incidents[0].assignments[0].assignee.id,
                        summary: expectedResponse.incidents[0].assignments[0].assignee.summary,
                        name: expectedResponse.incidents[0].assignments[0].assignee.name,
                        email: expectedResponse.incidents[0].assignments[0].assignee.email,
                        avatar_url: expectedResponse.incidents[0].assignments[0].assignee.avatar_url,
                        html_url: expectedResponse.incidents[0].assignments[0].assignee.html_url,
                      }
                    }
                  ]
                }
              ]
            })
        );

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        const incidents: PagerDutyIncident[] = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(incidents).toEqual(expectedResponse);
      });

      it.each(testInputs)('returns unauthorized', async () => {
        mocked(fetch).mockReturnValue(mockedResponse(401, {}));
        
        const serviceId = "SERV1C31D";
        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get incidents for service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it.each(testInputs)('returns BAD REQUEST when service id is not provided', async () => {
        const serviceId = '';

        const expectedStatusCode = 404;

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        expect(response.status).toEqual(expectedStatusCode);
      });
    });
  });
});