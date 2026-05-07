import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { rootRouteRef } from './routes';

const resourceActionHubPage = PageBlueprint.make({
  params: {
    path: '/resource-actionhub',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/ResourceActionHubPage').then(m => (
        <m.ResourceActionHubPage />
      )),
  },
});

export default createFrontendPlugin({
  pluginId: 'resource-actionhub',
  routes: {
    root: rootRouteRef,
  },
  extensions: [resourceActionHubPage],
});
