import { createDevApp } from '@backstage/dev-utils';
import { resourceActionhubPlugin, ResourceActionhubPage } from '../src/plugin';

createDevApp()
  .registerPlugin(resourceActionhubPlugin)
  .addPage({
    element: <ResourceActionhubPage />,
    title: 'Root Page',
    path: '/resource-actionhub',
  })
  .render();
