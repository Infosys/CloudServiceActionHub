import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

/**
 * Cloud Reseorce Action Hub backend plugin
 *
 * @public
 */
export const resourceActionhubPlugin = createBackendPlugin({
  pluginId: 'resource-actionhub',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
      },
      async init({ logger, config, httpRouter, httpAuth }) {
        logger.info('Initializing Cloud Reseorce Action Hub backend plugin');

        // Set auth policies first, before mounting the router
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated'
        });
        httpRouter.addAuthPolicy({
          path: '/resources',
          allow: 'unauthenticated'
        });
        httpRouter.addAuthPolicy({
          path: '/ec2-action',
          allow: 'unauthenticated'
        });
        httpRouter.addAuthPolicy({
          path: '/rds-action',
          allow: 'unauthenticated'
        });
        httpRouter.addAuthPolicy({
          path: '/gcp-action',
          allow: 'unauthenticated'
        });
         httpRouter.addAuthPolicy({
          path: '/getAllAwsRegions',
          allow: 'unauthenticated'
        });

        // Create and mount the router
        const router = await createRouter({
          logger,
          config,
          httpAuth,
        });

        httpRouter.use(router);

        logger.info('Cloud Reseorce Action Hub backend plugin initialized successfully');
      },
    });
  },
});