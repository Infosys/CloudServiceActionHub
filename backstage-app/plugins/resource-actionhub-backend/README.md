# Resource ActionHub Plugin for Backstage

The Resource ActionHub Plugin for Backstage helps teams discover and operate cloud resources directly from Backstage.
It currently supports AWS EC2 instance listing and actions (`start`, `stop`, `reboot`).

## Installation

Install both Resource ActionHub packages from your Backstage root:

```bash
yarn --cwd packages/app add @infosys_ltd/resource-actionhub
yarn --cwd packages/backend add @infosys_ltd/resource-actionhub-backend
```

## Configuration

### Backend Configuration

Add backend plugin registration in `packages/backend/src/index.ts`:

```ts
backend.add(import('@infosys_ltd/resource-actionhub-backend'));
```

Set backend environment variables:

```bash
export AWS_ACCESS_KEY_ID="<your-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-secret-access-key>"
export AWS_REGION="us-east-1"
```

### Frontend Configuration

Add frontend page route in `packages/app/src/App.tsx`:

```tsx
import { ResourceActionHubPage } from '@infosys_ltd/resource-actionhub';

<Route path="/resource-actionhub" element={<ResourceActionHubPage />} />
```

### Run

```bash
yarn start
```

Open `http://localhost:3000/resource-actionhub`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements or bug fixes.

## License

This project is licensed under the Apache License 2.0.