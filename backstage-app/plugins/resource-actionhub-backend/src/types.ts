/**
 * Start Stop Hub Backend Plugin - Type Definitions
 * @packageDocumentation
 */

/**
 * Supported cloud providers
 * @public
 */
export type CloudProvider = 'AWS' | 'Azure' | 'GCP';

/**
 * Supported cloud services per provider
 * @public
 */
export type CloudService = 'EC2' | 'RDS' | 'VM' | 'Compute Engine (VM)';

/**
 * Request payload from frontend to backend
 * @public
 */
export interface ResourceExplorerRequest {
  provider: CloudProvider;
  service: CloudService;
  region: string;
  project?: string;
  userEntityRef?: string;
  userGroups?: string[];
  instance_id?:string;
  action?:string;
  userId?:string;
}

/**
 * Request payload for start and stop instance
 * @public
 */
export interface ResourceExplorerStartStopRequest {
  region: string;
  instance_id?:string;
  action?:string;
  userId?:string;
}

/**
 * EC2 Instance data structure from external API
 * @public
 */
export interface EC2InstanceData {
  status: string;
  ip: string;
  hostname: string;
}

/**
 * RDS Instance data structure from external API
 * @public
 */
export interface RDSInstanceData {
  status: string;
  engine: string;
  endpoint: string;
}

/**
 * GCP Compute Engine Instance data structure from external API
 * @public
 */
export interface GCPInstanceData {
  instance_id: string;
  zone: string;
  ip: string;
  status: string;
}

/**
 * EC2 API Response structure from external API
 * @public
 */
export interface EC2ApiResponse {
  instance_data: {
    [instanceName: string]: EC2InstanceData;
  };
}

/**
 * RDS API Response structure from external API
 * @public
 */
export interface RDSApiResponse {
  isSuccess: boolean;
  rds_data: Array<{
    instance_name: string;
    status: string;
    engine: string;
    endpoint: string;
  }>;
}

/**
 * GCP Compute Engine API Response structure from external API
 * @public
 */
export interface GCPApiResponse {
  list_output: GCPInstanceData[];
}

/**
 * Normalized instance data for frontend consumption
 * @public
 */
export interface NormalizedInstanceData {
  instanceName: string;
  ip?: string;
  hostname?: string;
  endpoint?: string;
  engine?: string;
  zone?: string;
  status: string;
}

/**
 * Generic API response sent to frontend
 * @public
 */
export interface ResourceExplorerResponse {
  success: boolean;
  data?: NormalizedInstanceData[];
  error?: string;
  message?: string;
}

/**
 * Configuration for external API endpoints
 * @public
 */
export interface ApiEndpointConfig {
  url: string;
  actionUrl?: string;
  token?: string;
  timeout?: number;
}

/**
 * Plugin configuration from app-config.yaml
 * @public
 */
export interface ResourceActionHubConfig {
  aws?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    ec2?: ApiEndpointConfig;
    rds?: ApiEndpointConfig;
  };
  azure?: {
    vm?: ApiEndpointConfig;
  };
  gcp?: {
    compute?: ApiEndpointConfig;
    projects?: ApiEndpointConfig;
  };
}