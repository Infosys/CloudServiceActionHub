import { createPlugin, createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'resource-actionhub',
});

export const resourceActionhubPlugin = createPlugin({
  id: 'resource-actionhub',
  routes: {
    root: rootRouteRef,
  },
});


