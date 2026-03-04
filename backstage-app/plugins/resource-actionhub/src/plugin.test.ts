import { resourceActionhubPlugin, rootRouteRef } from './plugin';

describe('resource-actionhub', () => {
  it('should export plugin', () => {
    expect(resourceActionhubPlugin).toBeDefined();
  });

  it('should have correct plugin id', () => {
    expect(resourceActionhubPlugin.getId()).toBe('resource-actionhub');
  });

  it('should export rootRouteRef', () => {
    expect(rootRouteRef).toBeDefined();
  });

  it('should have routes configured', () => {
    expect(resourceActionhubPlugin.routes).toBeDefined();
    expect(resourceActionhubPlugin.routes).toHaveProperty('root');
  });
});
