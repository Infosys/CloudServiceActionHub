import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const resourceActionhubPlugin = createPlugin({
  id: 'resource-actionhub',
  routes: {
    root: rootRouteRef,
  },
});

export const ResourceActionhubPage = resourceActionhubPlugin.provide(
  createRoutableExtension({
    name: 'ResourceActionhubPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
