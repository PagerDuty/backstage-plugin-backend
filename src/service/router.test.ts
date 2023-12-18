import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { PagerDutyEscalationPolicy } from '../types';

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
});