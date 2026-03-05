import {
  mockErrorHandler,
  mockServices,
} from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';

describe('createRouter', () => {
  let app: express.Express;

  beforeEach(async () => {
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig({
        data: {
          'resource-actionhub': {
            aws: {
              accessKeyId: 'test-access-key',
              secretAccessKey: 'test-secret-key',
              region: 'us-east-1',
              ec2: {
                url: 'http://localhost:3000/ec2',
                actionUrl: 'http://localhost:3000/ec2/action',
                timeout: 30000,
              },
            },
          },
        },
      }),
      httpAuth: mockServices.httpAuth(),
    });
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  describe('GET /health', () => {
    it('should return health status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /resources', () => {
    it('should return 400 when provider is missing', async () => {
      const response = await request(app).post('/resources').send({
        service: 'EC2',
        region: 'us-east-1',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Provider is required');
    });

    it('should return 400 when service is missing', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'AWS',
        region: 'us-east-1',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Service is required');
    });

    it('should return 400 when region is missing', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'AWS',
        service: 'EC2',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Region/Location is required');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'InvalidProvider',
        service: 'EC2',
        region: 'us-east-1',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid provider. Must be AWS, Azure, or GCP');
    });

    it('should return 400 for invalid AWS service', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'AWS',
        service: 'InvalidService',
        region: 'us-east-1',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid AWS service. Currently supported: EC2, RDS');
    });

    it('should return 400 for invalid Azure service', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'Azure',
        service: 'InvalidService',
        region: 'eastus',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Azure service. Currently supported: VM');
    });

    it('should return 400 for invalid GCP service', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'GCP',
        service: 'InvalidService',
        region: 'us-central1',
        project: 'test-project',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid GCP service. Currently supported: Compute Engine (VM)');
    });

    it('should return 400 when GCP project is missing', async () => {
      const response = await request(app).post('/resources').send({
        provider: 'GCP',
        service: 'Compute Engine (VM)',
        region: 'us-central1',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project ID is required for GCP');
    });
  });

  describe('POST /ec2-action', () => {
    it('should return 400 when instance_id is missing', async () => {
      const response = await request(app).post('/ec2-action').send({
        region: 'us-east-1',
        action: 'start',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Instance id is required');
    });

    it('should return 400 when action is missing', async () => {
      const response = await request(app).post('/ec2-action').send({
        region: 'us-east-1',
        instance_id: 'i-1234567890abcdef0',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Action is required');
    });

    it('should return 400 when region is missing', async () => {
      const response = await request(app).post('/ec2-action').send({
        instance_id: 'i-1234567890abcdef0',
        action: 'start',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Region/Location is required');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app).post('/ec2-action').send({
        region: 'us-east-1',
        instance_id: 'i-1234567890abcdef0',
        action: 'invalid-action',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action. Must be start, stop, or reboot');
    });
  });

  describe('POST /rds-action', () => {
    it('should return 400 when instance_id is missing', async () => {
      const response = await request(app).post('/rds-action').send({
        region: 'us-east-1',
        action: 'start',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Instance id is required');
    });

    it('should return 400 when action is missing', async () => {
      const response = await request(app).post('/rds-action').send({
        region: 'us-east-1',
        instance_id: 'my-rds-instance',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Action is required');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app).post('/rds-action').send({
        region: 'us-east-1',
        instance_id: 'my-rds-instance',
        action: 'terminate',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action. Must be start, stop, or reboot');
    });
  });

  describe('POST /gcp-action', () => {
    it('should return 400 when instance_id is missing', async () => {
      const response = await request(app).post('/gcp-action').send({
        region: 'us-central1-a',
        action: 'start',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Instance id is required');
    });

    it('should return 400 when action is missing', async () => {
      const response = await request(app).post('/gcp-action').send({
        region: 'us-central1-a',
        instance_id: 'my-gcp-instance',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Action is required');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app).post('/gcp-action').send({
        region: 'us-central1-a',
        instance_id: 'my-gcp-instance',
        action: 'delete',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action. Must be start, stop, or reboot');
    });
  });

  describe('POST /getAllAwsRegions', () => {
    it('should return 400 when AWS credentials are not configured', async () => {
      // Create router without AWS credentials - omit the keys entirely
      const routerWithoutCreds = await createRouter({
        logger: mockServices.logger.mock(),
        config: mockServices.rootConfig({
          data: {
            'resource-actionhub': {
              aws: {
                region: 'us-east-1',
              },
            },
          },
        }),
        httpAuth: mockServices.httpAuth(),
      });
      const appWithoutCreds = express();
      appWithoutCreds.use(routerWithoutCreds);
      appWithoutCreds.use(mockErrorHandler());

      const response = await request(appWithoutCreds).post('/getAllAwsRegions').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('AWS credentials are required to fetch regions');
    });
  });
});
