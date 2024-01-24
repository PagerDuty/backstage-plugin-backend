import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { PagerDutyEscalationPolicy, PagerDutyService, PagerDutyServiceResponse, PagerDutyOnCallUsersResponse, PagerDutyChangeEventsResponse, PagerDutyChangeEvent, PagerDutyIncidentsResponse, PagerDutyIncident } from '@pagerduty/backstage-plugin-common';

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
            apiToken: `${process.env.PAGERDUTY_TOKEN}`,
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
    it('returns ok', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
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
        })
      ) as jest.Mock;

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

    it('returns unauthorized', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 401
        })
      ) as jest.Mock;

      const expectedStatusCode = 401;
      const expectedErrorMessage = "Failed to list escalation policies. Caller did not supply credentials or did not provide the correct credentials.";

      const response = await request(app).get('/escalation_policies');

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.text).toMatch(expectedErrorMessage);
    });

    it('returns empty list when no escalation policies exist', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
            escalation_policies: []
          })
        })
      ) as jest.Mock;

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
    it('returns ok', async () => {
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

      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
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
        })
      ) as jest.Mock;



      const response = await request(app).get(`/oncall-users?escalation_policy_ids[]=${escalationPolicyId}`);

      const oncallUsersResponse: PagerDutyOnCallUsersResponse = JSON.parse(response.text);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.body).toEqual(expectedResponse);
      expect(oncallUsersResponse.users.length).toEqual(2);
    });

    it('returns unauthorized', async () => {
      const escalationPolicyId = "12345";
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 401
        })
      ) as jest.Mock;

      const expectedStatusCode = 401;
      const expectedErrorMessage = "Failed to list oncalls. Caller did not supply credentials or did not provide the correct credentials.";

      const response = await request(app).get(`/oncall-users?escalation_policy_ids[]=${escalationPolicyId}`);

      expect(response.status).toEqual(expectedStatusCode);
      expect(response.text).toMatch(expectedErrorMessage);
    });

    it('returns empty list when no escalation policies exist', async () => {
      const escalationPolicyId = "12345";
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve(
            {
              "oncalls": []
            }
          )
        })
      ) as jest.Mock;

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
      it('returns ok', async () => {
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

        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
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
          })
        ) as jest.Mock;



        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        const service: PagerDutyService = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(service).toEqual(expectedResponse);

      });

      it('returns unauthorized', async () => {
        const integrationKey = "INT3GR4T10NK3Y";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 401
          })
        ) as jest.Mock;

        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it('returns NOT FOUND when integration key does not belong to a service', async () => {
        const integrationKey = "INT3GR4T10NK3Y";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            json: () => Promise.resolve(
              {
                "services": [],
                "limit": 25,
                "offset": 0,
                "total": null,
                "more": false
              }
            )
          })
        ) as jest.Mock;

        const expectedStatusCode = 404;
        const expectedResponse = "Failed to get service. The requested resource was not found.";

        const response = await request(app).get(`/services?integration_key=${integrationKey}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);

      });
    });

    describe('with service id', () => {
      it('returns ok', async () => {
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

        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
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
          })
        ) as jest.Mock;

        const response = await request(app).get(`/services/${serviceId}`);

        const service: PagerDutyService = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(service).toEqual(expectedResponse);
      });

      it('returns unauthorized', async () => {
        const serviceId = "SERV1C31D";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 401
          })
        ) as jest.Mock;

        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it('returns NOT FOUND if service id does not exist', async () => {
        const serviceId = "SERV1C31D";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 404,
            json: () => Promise.resolve(
              {
                "error": {
                  "message": "Not Found",
                  "code": 2100
                }
              }
            )
          })
        ) as jest.Mock;

        const expectedStatusCode = 404;
        const expectedResponse = "Failed to get service. The requested resource was not found.";

        const response = await request(app).get(`/services/${serviceId}`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);
      });
    });

    describe('change-events', () => {
      it('returns ok', async () => {
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

        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
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
          })
        ) as jest.Mock;

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        const changeEvents: PagerDutyChangeEvent[] = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(changeEvents).toEqual(expectedResponse);
      });

      it('returns unauthorized', async () => {
        const serviceId = "SERV1C31D";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 401
          })
        ) as jest.Mock;

        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get change events for service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it('returns NOT FOUND if service id does not exist', async () => {
        const serviceId = "SERV1C31D";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 404,
            json: () => Promise.resolve(
              {
                "error": {
                  "message": "Not Found",
                  "code": 2100
                }
              }
            )
          })
        ) as jest.Mock;

        const expectedStatusCode = 404;
        const expectedResponse = "Failed to get change events for service. The requested resource was not found.";

        const response = await request(app).get(`/services/${serviceId}/change-events`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.body).toEqual(expectedResponse);
      });
    });

    describe('incidents', () => {
      it('returns ok', async () => {
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

        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
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
          })
        ) as jest.Mock;

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        const incidents: PagerDutyIncident[] = JSON.parse(response.text);

        expect(response.status).toEqual(expectedStatusCode);
        expect(incidents).toEqual(expectedResponse);
      });

      it('returns unauthorized', async () => {
        const serviceId = "SERV1C31D";
        global.fetch = jest.fn(() =>
          Promise.resolve({
            status: 401
          })
        ) as jest.Mock;

        const expectedStatusCode = 401;
        const expectedErrorMessage = "Failed to get incidents for service. Caller did not supply credentials or did not provide the correct credentials.";

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        expect(response.status).toEqual(expectedStatusCode);
        expect(response.text).toMatch(expectedErrorMessage);
      });

      it('returns BAD REQUEST when service id is not provided', async () => {
        const serviceId = '';
        // global.fetch = jest.fn(() =>
        //   Promise.resolve({
        //     status: 401
        //   })
        // ) as jest.Mock;

        const expectedStatusCode = 404;
        // const expectedErrorMessage = "Bad Request: 'serviceId' is required";

        const response = await request(app).get(`/services/${serviceId}/incidents`);

        expect(response.status).toEqual(expectedStatusCode);
        // expect(response.text).toMatch(expectedErrorMessage);
      });
    });
  });
});