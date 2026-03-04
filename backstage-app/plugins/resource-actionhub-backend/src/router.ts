import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { InputError, NotFoundError } from '@backstage/errors';
import express from 'express';
import cors from 'cors';
import Router from 'express-promise-router';
import fetch from 'node-fetch';
import { EC2Client, StartInstancesCommand, StopInstancesCommand, RebootInstancesCommand, DescribeInstancesCommand, DescribeInstancesCommandOutput, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import {
  ResourceExplorerRequest,
  ResourceExplorerResponse,
  NormalizedInstanceData,
  ResourceActionHubConfig,
} from './types';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  httpAuth: HttpAuthService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();

  // ✅ Enable CORS and JSON parsing
  router.use(cors());
  router.use(express.json());

  const pluginConfig = config.getOptionalConfig('resource-actionhub');
  
  // Validate that plugin configuration exists
  if (!pluginConfig) {
    logger.warn(
      'Start Stop Hub plugin configuration is missing. ' +
      'Please add the "resource-actionhub" section to your app-config.yaml file. ' +
      'Plugin will start but routes will return errors until configured.'
    );
  }

  // Build API configuration from app-config.yaml with safe defaults
  const apiConfig: ResourceActionHubConfig = {
    aws: {
      accessKeyId: pluginConfig?.getOptionalString('aws.accessKeyId') || '',
      secretAccessKey: pluginConfig?.getOptionalString('aws.secretAccessKey') || '',
      region: pluginConfig?.getOptionalString('aws.region') || '',
      ec2: {
        url: pluginConfig?.getOptionalString('aws.ec2.url') || '',
        actionUrl: pluginConfig?.getOptionalString('aws.ec2.actionUrl') || '',
        timeout: pluginConfig?.getOptionalNumber('aws.ec2.timeout') || 30000,
      },
    },
  };

  logger.info('Start Stop Hub plugin configured successfully');
  // Make apiConfig globally accessible for handler functions
  (globalThis as any).apiConfig = apiConfig;

  // Health check endpoint: GET /api/resource-actionhub/health
  router.get('/health', (_, response) => {
    logger.info('Health check endpoint called');
    response.json({ status: 'ok' });
  });

  // Main endpoint to fetch cloud resources: POST /api/resource-actionhub/resources
  router.post('/resources', async (req, res) => {
    try {
      // const credentials = await httpAuth.credentials(req as any);
      const requestData: ResourceExplorerRequest = req.body;
      validateRequest(requestData, 'resources');

       logger.info(
        `Fetching resources for provider: ${requestData.provider}, service: ${requestData.service}, region: ${requestData.region}`
      );

      const response = await handleResourceRequest(
        requestData,
        logger,
      );

      res.json(response);
    } catch (error) {
      logger.error(`Error processing request: ${error}`);

      const errorResponse: ResourceExplorerResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      if (error instanceof InputError) {
        res.status(400).json(errorResponse);
      } else if (error instanceof NotFoundError) {
        res.status(404).json(errorResponse);
      } else {
        res.status(500).json(errorResponse);
      }
    }
  });

  router.post('/ec2-action', async (req, res) => {
  try {
    // const credentials = await httpAuth.credentials(req as any);
    const requestData: ResourceExplorerRequest = req.body;
    validateRequest(requestData, "ec2-action");

    logger.info(
      `Performing EC2 action for region: ${requestData.region}`
    );

    const response = await fetchAwsEc2InstancesStartStopReboot(
      requestData,
      logger,
    );

    res.json(response);
  } catch (error) {
    logger.error(`Error processing EC2 action request: ${error}`);

    const errorResponse: ResourceExplorerResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    if (error instanceof InputError) {
      res.status(400).json(errorResponse);
    } else if (error instanceof NotFoundError) {
      res.status(404).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

  router.post('/getAllAwsRegions', async (_req, res) => {
    try {
      const awsConfig = (globalThis as any).apiConfig?.aws || {};
      const awsRegion = awsConfig.region || 'us-east-1';

      if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
        throw new InputError('AWS credentials are required to fetch regions');
      }

      const client = new EC2Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
        },
      });

      const command = new DescribeRegionsCommand({ AllRegions: true });
      const response = await client.send(command);
      const regions = Array.isArray(response.Regions)
        ? response.Regions.map(r => r.RegionName).filter((name): name is string => typeof name === 'string')
        : [];
      return res.json(regions);
    } catch (error: any) {
      logger.error(`Error fetching AWS regions: ${error}`);

      if (error instanceof InputError) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const errorCode = error?.name || error?.Code || error?.Error?.Code;
      if (errorCode === 'AuthFailure' || errorCode === 'InvalidClientTokenId' || errorCode === 'RequestExpired') {
        return res.status(401).json({
          success: false,
          error: 'AWS was not able to validate the provided access credentials',
        });
      }

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AWS regions',
      });
    }
  });

  router.post('/rds-action', async (req, res) => {
  try {
    // const credentials = await httpAuth.credentials(req as any);
    const requestData: ResourceExplorerRequest = req.body;
    validateRequest(requestData, "rds-action");

    logger.info(
      `Performing RDS action for region: ${requestData.region}`
    );

    const response = await fetchAwsRdsInstancesStartStopReboot(
      requestData,
      logger,
    );

    res.json(response);
  } catch (error) {
    logger.error(`Error processing RDS action request: ${error}`);

    const errorResponse: ResourceExplorerResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    if (error instanceof InputError) {
      res.status(400).json(errorResponse);
    } else if (error instanceof NotFoundError) {
      res.status(404).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

  // New GCP Compute Engine action endpoint
  router.post('/gcp-action', async (req, res) => {
    try {
      // const credentials = await httpAuth.credentials(req as any);
      const requestData: ResourceExplorerRequest = req.body;
      validateRequest(requestData, "gcp-action");

      logger.info(
        `Performing GCP Compute Engine action for location: ${requestData.region}`
      );

      const response = await fetchGcpComputeInstanceAction(
        requestData,
        logger,
      );

      res.json(response);
    } catch (error) {
      logger.error(`Error processing GCP action request: ${error}`);

    const errorResponse: ResourceExplorerResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',      };

    if (error instanceof InputError) {
      res.status(400).json(errorResponse);
    } else if (error instanceof NotFoundError) {
        res.status(404).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

  return router;
}

// --- Validation and handlers ---

function validateRequest(request: ResourceExplorerRequest, _reqType: string | undefined): void {
  if (_reqType == 'resources') {
    if (!request.provider) {
      throw new InputError('Provider is required');
    }
    if (!request.service) {
      throw new InputError('Service is required');
    }
    if (!['AWS', 'Azure', 'GCP'].includes(request.provider) && _reqType == 'resources') {
      throw new InputError('Invalid provider. Must be AWS, Azure, or GCP');
    }
    if (request.provider === 'AWS' && !['EC2', 'RDS'].includes(request.service) && _reqType == 'resources') {
      throw new InputError('Invalid AWS service. Currently supported: EC2, RDS');
    }
    if (request.provider === 'Azure' && !['VM'].includes(request.service) && _reqType == 'resources') {
      throw new InputError('Invalid Azure service. Currently supported: VM');
    }
    if (request.provider === 'GCP' && !['Compute Engine (VM)'].includes(request.service) && _reqType == 'resources') {
      throw new InputError('Invalid GCP service. Currently supported: Compute Engine (VM)');
    }
  } else if (_reqType === 'ec2-action' || _reqType === 'rds-action' || _reqType === 'gcp-action') {
    if (!request.instance_id) {
      throw new InputError('Instance id is required');
    }
    if (!request.action) {
      throw new InputError('Action is required');
    }
    if (!['start', 'stop', 'reboot'].includes(request.action)) {
      throw new InputError('Invalid action. Must be start, stop, or reboot');
    }
  }
  if (!request.region) {
    throw new InputError('Region/Location is required');
  }
  if (_reqType === 'resources' && request.provider === 'GCP' && !request.project) {
    throw new InputError('Project ID is required for GCP');
  }
}

async function handleResourceRequest(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  const { provider, service } = request;
  if (provider === 'AWS' && service === 'EC2') {
    return await fetchAwsEc2Instances(request, logger);
  }
  if (provider === 'AWS' && service === 'RDS') {
    return await fetchAwsRdsInstances(request, logger);
  }
  if (provider === 'Azure' && service === 'VM') {
    return await fetchAzureVmInstances(request, logger);
  }
  if (provider === 'GCP' && service === 'Compute Engine (VM)') {
    return await fetchGcpComputeInstances(request, logger);
  }
  throw new NotFoundError(`No handler configured for ${provider} ${service}`);
}

async function fetchAwsEc2Instances(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  // Use apiConfig from the outer scope
  const awsConfig = (globalThis as any).apiConfig?.aws || {};
  try {
    logger.info(`Listing EC2 instances using AWS SDK in region: ${request.region}`);
    logger.info(`AWS credentials debug: accessKeyId: ${awsConfig.accessKeyId || '[not set]'}, secretAccessKey: ${awsConfig.secretAccessKey ? awsConfig.secretAccessKey.substring(0, 4) + '...' : '[not set]'}, region: ${awsConfig.region || request.region}`);
    if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
      logger.error('AWS credentials are missing in config!');
    }
    const ec2 = new EC2Client({
      region: request.region || awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId || '',
        secretAccessKey: awsConfig.secretAccessKey || '',
      },
    });
    const result: DescribeInstancesCommandOutput = await ec2.send(new DescribeInstancesCommand({}));
    // Parse result to normalizedData
    const instances: NormalizedInstanceData[] = [];
    if (result.Reservations) {
      for (const reservation of result.Reservations) {
        if (reservation.Instances) {
          for (const instance of reservation.Instances) {
            instances.push({
              instanceName: instance.InstanceId || '',
              ip: instance.PublicIpAddress || instance.PrivateIpAddress || '',
              hostname: instance.PublicDnsName || instance.PrivateDnsName || '',
              status: instance.State?.Name || '',
            });
          }
        }
      }
    }
    logger.info(`Successfully fetched ${instances.length} EC2 instances`);
    return {
      success: true,
      data: instances,
    };
  } catch (error: any) {
    logger.error(`Failed to fetch AWS EC2 instances: ${error}`);
    // Handle AWS auth/region errors gracefully - return empty results instead of error
    const errorName = error?.name || '';
    if (errorName === 'AuthFailure' || errorName === 'RequestExpired' || errorName === 'InvalidClientTokenId') {
      logger.warn(`AWS credential/region issue for region ${request.region}, returning empty results`);
      return {
        success: true,
        data: [],
      };
    }
    throw error;
  }
}

async function fetchAwsRdsInstances(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  // Use apiConfig from the outer scope
  const endpointConfig = (globalThis as any).apiConfig?.aws?.rds || undefined;
  if (!endpointConfig?.url) {
    throw new NotFoundError('AWS RDS API endpoint not configured');
  }
  try {
    const apiPayload = {
      // account_id removed
      region: request.region,
      userId: request.userId
    };

    logger.info(`Calling AWS RDS API: ${endpointConfig.url}`);
    logger.info(`--------------------- API Payload--------------------: ${JSON.stringify(apiPayload)}`);
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const response = await fetch(endpointConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiPayload),
      timeout: endpointConfig.timeout || 30000,
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`RDS API Error Response Text: ${errorText}`);
      throw new Error(
        `AWS RDS API returned ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    const apiResponse = await response.json();
    logger.info(`Raw RDS API Response: ${JSON.stringify(apiResponse)}`);

    const normalizedData = normalizeRdsData(apiResponse);

    logger.info(`Successfully fetched ${normalizedData.length} RDS instances`);

    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    logger.error(`Failed to fetch AWS RDS instances: ${error}`);
    throw error;
  }
}

async function fetchGcpComputeInstances(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  // Use apiConfig from the outer scope
  const endpointConfig = (globalThis as any).apiConfig?.gcp?.compute || undefined;
  if (!endpointConfig?.url) {
    throw new NotFoundError('GCP Compute Engine API endpoint not configured');
  }
  try {
    logger.info(`GCP Request Debug - project: ${request.project}, region: ${request.region}`);
    
    const apiPayload = {
      project_id: request.project,
      location: request.region,
      // userId: request.userId
    };

    logger.info(`Calling GCP Compute Engine API: ${endpointConfig.url}`);
    logger.info(`--------------------- API Payload--------------------: ${JSON.stringify(apiPayload)}`);
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const response = await fetch(endpointConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiPayload),
      timeout: endpointConfig.timeout || 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`GCP API Error Response Text: ${errorText}`);
      throw new Error(
        `GCP Compute Engine API returned ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    const apiResponse = await response.json();
    logger.info(`Raw GCP API Response: ${JSON.stringify(apiResponse)}`);

    const normalizedData = normalizeGcpData(apiResponse);

    logger.info(`Successfully fetched ${normalizedData.length} GCP Compute Engine instances`);

    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    logger.error(`Failed to fetch GCP Compute Engine instances: ${error}`);
    throw error;
  }
}

async function fetchAwsEc2InstancesStartStopReboot(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  if (!request.region || !request.instance_id || !request.action) {
    throw new InputError('Missing required EC2 action parameters (region, instance_id, action)');
  }
  try {
    logger.info(`Performing EC2 action '${request.action}' on instance '${request.instance_id}' in region '${request.region}'`);
    const ec2 = new EC2Client({ region: request.region });
    let result;
    if (request.action === 'start') {
      result = await ec2.send(new StartInstancesCommand({ InstanceIds: [request.instance_id] }));
    } else if (request.action === 'stop') {
      result = await ec2.send(new StopInstancesCommand({ InstanceIds: [request.instance_id] }));
    } else if (request.action === 'reboot') {
      result = await ec2.send(new RebootInstancesCommand({ InstanceIds: [request.instance_id] }));
    } else {
      throw new InputError(`Unsupported EC2 action: ${request.action}`);
    }
    logger.info(`EC2 action result: ${JSON.stringify(result)}`);
    return {
      success: true,
      message: `EC2 action '${request.action}' executed successfully`,
    };
  } catch (error) {
    logger.error(`Failed to perform EC2 action: ${error}`);
    throw error;
  }
}

async function fetchAwsRdsInstancesStartStopReboot(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  // Use apiConfig from the outer scope
  const endpointConfig = (globalThis as any).apiConfig?.aws?.rds || undefined;
  if (!endpointConfig?.actionUrl) {
    throw new NotFoundError('AWS RDS Action API endpoint not configured');
  }
  try {
    const apiPayload = {
      // account_id removed
      region: request.region,
      instance_id: request.instance_id,
      action: request.action,
      userId: request.userId
    };
    logger.info(`Calling AWS RDS Action API: ${endpointConfig.actionUrl}`);
    logger.info(`RDS Action API Payload: ${JSON.stringify(apiPayload)}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (endpointConfig.token) {
      headers.Authorization = `Bearer ${endpointConfig.token}`;
    }
    const response = await fetch(endpointConfig.actionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiPayload),
      timeout: endpointConfig.timeout || 30000,
    });

    logger.info(`RDS Action API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`RDS Action API Error Response: ${errorText}`);
      throw new Error(
        `AWS RDS Action API returned ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    const apiResponse = await response.json();
    logger.info(`RDS Action API Response: ${JSON.stringify(apiResponse)}`);

    return {
      success: true,
      message: apiResponse.message || 'Action completed successfully',
    };
  } catch (error) {
    logger.error(`Failed to perform RDS action: ${error}`);
    throw error;
  }
}

async function fetchGcpComputeInstanceAction(
  request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  // Use apiConfig from the outer scope
  const endpointConfig = (globalThis as any).apiConfig?.gcp?.compute || undefined;
  if (!endpointConfig?.actionUrl) {
    throw new NotFoundError('GCP Compute Engine Action API endpoint not configured');
  }
  try {
    // Build action-specific URL: base URL + '/' + action
    // e.g., http://10.224.110.5:4747/compute/vm_instances/start
    const actionUrl = `${endpointConfig.actionUrl.replace('/instance-action', '')}/${request.action}`;
    
    const apiPayload = {
      project_id: request.project,
      zone: request.region,  // This should be the zone from the instance, e.g., us-east4-a
      instance_id: request.instance_id,
    };
    logger.info(`Calling GCP Compute Engine Action API: ${actionUrl}`);
    logger.info(`GCP Action API Payload: ${JSON.stringify(apiPayload)}`);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (endpointConfig.token) {
      headers.Authorization = `Bearer ${endpointConfig.token}`;
    }
    const response = await fetch(actionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiPayload),
      timeout: endpointConfig.timeout || 30000,
    });

    logger.info(`GCP Action API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`GCP Action API Error Response: ${errorText}`);
      throw new Error(
        `GCP Compute Engine Action API returned ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    const apiResponse = await response.json();
    logger.info(`GCP Action API Response: ${JSON.stringify(apiResponse)}`);

    return {
      success: true,
      message: apiResponse.message || 'Action completed successfully',
    };
  } catch (error) {
    logger.error(`Failed to perform GCP Compute Engine action: ${error}`);
    throw error;
  }
}

async function fetchAzureVmInstances(
  _request: ResourceExplorerRequest,
  logger: LoggerService,
): Promise<ResourceExplorerResponse> {
  logger.warn('Azure VM API integration not yet implemented');
  return {
    success: false,
    error: 'Azure VM integration coming soon',
    message: 'This feature is under development',
  };
}

function normalizeRdsData(apiResponse: any): NormalizedInstanceData[] {
  const instances: NormalizedInstanceData[] = [];

  // Handle RDS API response format
  if (apiResponse.isSuccess && apiResponse.rds_data && Array.isArray(apiResponse.rds_data)) {
    apiResponse.rds_data.forEach((instance: any) => {
      instances.push({
        instanceName: instance.instance_name,
        endpoint: instance.endpoint,
        engine: instance.engine,
        status: instance.status,
      });
    });
  }

  return instances;
}

function normalizeGcpData(apiResponse: any): NormalizedInstanceData[] {
  const instances: NormalizedInstanceData[] = [];

  // Handle GCP API response format
  if (apiResponse.list_output && Array.isArray(apiResponse.list_output)) {
    apiResponse.list_output.forEach((instance: any) => {
      instances.push({
        instanceName: instance.instance_id,
        zone: instance.zone,
        ip: instance.ip,
        status: instance.status,
      });
    });
  }

  return instances;
}