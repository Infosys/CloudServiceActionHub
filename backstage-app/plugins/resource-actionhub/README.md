# resource-actionhub

This plugin backend was templated using the Backstage CLI. You should replace this text with a description of your plugin backend.

## Installation

Install both Resource ActionHub packages:

```bash
# From your root directory
yarn --cwd packages/app add @infosys_ltd/resource-actionhub
yarn --cwd packages/backend add @infosys_ltd/resource-actionhub-backend
```
Set AWS environment variables before running Backstage:

```bash
export AWS_ACCESS_KEY_ID="<your-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-secret-access-key>"
export AWS_REGION="<your-region>"
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.
