# Resource ActionHub Plugin for Backstage

The Resource ActionHub Plugin for Backstage helps teams discover and operate cloud resources directly from Backstage.
It currently supports AWS EC2 instance listing and actions (`start`, `stop`, `reboot`).

---

## Installation

To install the frontend plugin, run:

```bash
yarn --cwd packages/app add @infosys_ltd/resource-actionhub
```

To install the backend plugin, run:

```bash
yarn --cwd packages/backend add @infosys_ltd/resource-actionhub-backend
```

---

## Configuration

Set environment variables:

```bash
export AWS_ACCESS_KEY_ID="<your-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-secret-access-key>"
export AWS_REGION="us-east-1"
```

3. Start Backstage:

```bash
yarn start
```

Open `http://localhost:3000/resource-actionhub`.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements or bug fixes.

---

## License

This project is licensed under the Apache License 2.0.