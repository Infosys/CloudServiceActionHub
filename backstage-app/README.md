# Welcome to the Resource ActionHub Plugin Repository for Backstage!

The Resource ActionHub Plugin for Backstage helps teams discover and operate cloud instances from a single Backstage UI.
It currently supports AWS EC2 resource listing and instance actions (start, stop, reboot).

## How It Works

1. **Backend Configuration**:
	- The plugin uses a secure backend service to fetch AWS EC2 data and perform instance actions, so credentials are not exposed in the client-side code.

2. **Fetching Resource Data**:
	- The frontend page sends provider, service, and selected region to the backend.
	- The backend fetches EC2 instance details using AWS SDK and returns normalized data.

3. **Executing and Displaying in Backstage**:
    - Instances are displayed in a searchable table for quick operations.
	- The table shows key EC2 details such as instance ID, IP, hostname, and current status.
	- Users can filter results by search text and trigger actions directly from each row.
	- Users can trigger start, stop, and reboot actions from the UI.
	- The backend invokes corresponding AWS EC2 actions and returns status messages.
	- **Start** action sends a request to start the selected stopped instance and refreshes the table with updated status.
	- **Stop** action sends a request to stop the selected running instance and refreshes the table with updated status.
	- **Reboot** action sends a request to reboot the selected running instance and refreshes the table with updated status.

FOR MORE INFORMATION AND SETUP PLEASE VISIT PLUGIN DOCS:
- Frontend: [plugins/resource-actionhub/README.md](plugins/resource-actionhub/README.md)
- Backend: [plugins/resource-actionhub-backend/README.md](plugins/resource-actionhub-backend/README.md)