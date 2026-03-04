import { startTestBackend } from '@backstage/backend-test-utils';
import { resourceActionhubPlugin } from './plugin';
import request from 'supertest';

describe('resourceActionhubPlugin', () => {
  it('should initialize and register the plugin', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    expect(server).toBeDefined();
  });

  it('should respond to health check endpoint', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    const response = await request(server).get('/api/resource-actionhub/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should have /resources endpoint available', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    // Without valid request body, should return 400 (InputError)
    const response = await request(server)
      .post('/api/resource-actionhub/resources')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should have /ec2-action endpoint available', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    // Without valid request body, should return 400 (InputError)
    const response = await request(server)
      .post('/api/resource-actionhub/ec2-action')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should have /rds-action endpoint available', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    // Without valid request body, should return 400 (InputError)
    const response = await request(server)
      .post('/api/resource-actionhub/rds-action')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should have /gcp-action endpoint available', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    // Without valid request body, should return 400 (InputError)
    const response = await request(server)
      .post('/api/resource-actionhub/gcp-action')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should have /getAllAwsRegions endpoint available', async () => {
    const { server } = await startTestBackend({
      features: [resourceActionhubPlugin],
    });

    // Without valid AWS credentials configured, should return 400 (InputError)
    const response = await request(server)
      .post('/api/resource-actionhub/getAllAwsRegions')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
