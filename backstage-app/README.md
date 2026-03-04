# Welcome to the Resource ActionHub Plugin Repository for Backstage!

The Resource ActionHub Plugin for Backstage helps teams discover and operate cloud instances from a single Backstage UI.
It currently supports AWS EC2 resource listing and instance actions (start, stop, reboot).

## How It Works

1. **Backend Configuration**:
	- The backend plugin reads AWS credentials and default region from `app-config.yaml`.
	- Backend APIs are exposed under `/api/resource-actionhub`.

2. **Fetching Resource Data**:
	- The frontend page sends provider, service, and selected region to the backend.
	- The backend fetches EC2 instance details using AWS SDK and returns normalized data.

3. **Executing Instance Actions**:
	- Users can trigger start, stop, and reboot actions from the UI.
	- The backend invokes corresponding AWS EC2 actions and returns status messages.

4. **Displaying in Backstage**:
	- The plugin page is available at `/resource-actionhub`.
	- Results are displayed in a searchable table for quick operations.

FOR MORE INFORMATION AND SETUP PLEASE VISIT PLUGIN DOCS:
- Frontend: [plugins/resource-actionhub/README.md](plugins/resource-actionhub/README.md)
- Backend: [plugins/resource-actionhub-backend/README.md](plugins/resource-actionhub-backend/README.md)