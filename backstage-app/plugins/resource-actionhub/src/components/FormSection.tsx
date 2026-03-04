import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, TextField, InputAdornment } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { useApi, discoveryApiRef, alertApiRef, identityApiRef, ProfileInfo } from '@backstage/core-plugin-api';
import { IconButton, Menu, Snackbar, Tooltip } from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import { makeStyles } from '@material-ui/core/styles';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import RefreshIcon from '@material-ui/icons/Refresh';
import useAsync from 'react-use/esm/useAsync';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { UserEntity } from '@backstage/catalog-model';

export function FormSection() {
  const identityApi = useApi(identityApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  // Form state variables
  const [provider, setProvider] = useState('');
  const [service, setService] = useState('');
  const [account, setAccount] = useState('');
  const [project, setProject] = useState('');
  const [region, setRegion] = useState('');
  const [allRegions, setAllRegions] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  // UI state variables
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const showFields = !!provider;

  // Dynamic labels based on provider
  const awsServices = ['EC2'];
  const serviceLabel = provider === 'Azure' ? 'AzureService' : 'Service';
  const regionLabel = provider === 'Azure' ? 'AzureRegion' : provider === 'GCP' ? 'Location' : 'Region';
  const serviceOptions = awsServices;

  // Snackbar state for notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [enableSearch, setEnableSearch] = useState(false);
  const [userID, setUserID] = useState('');

  // Styles for the refresh button
  const useStyles = makeStyles(theme => ({
    circularOutline: {
      border: `2px solid #1473E6`,
      borderRadius: '50%',
      width: 10,
      height: 10,
      top: 8,
      right: 8,
      color: '#1473E6'
    },
  }));

  const classes = useStyles();

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Decide the source array for the table (filtered or original data)
  const data = filteredData ?? tableData ?? [];

  // Compute page boundaries for pagination
  const start = page * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = data.slice(start, end);

  // Derived values for the pagination footer
  const rowCount = data.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / rowsPerPage));

  // Pagination handlers
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(next);
    setPage(0); // Reset to first page when changing page size
  };

  // Get table columns dynamically from data
  const columns = rowCount > 0 ? Object.keys(data[0]) : [];

  // Effect to fetch project IDs when account is selected
  useEffect(() => {
    provider === 'AWS' && fetchRegion(provider);
    if (account && provider === 'GCP') {
      console.log('Account selected:', account);
      setLoadingAccounts(true);
    } else if (!account) {
      setProjects([]);
    }
  }, [account, provider]);

  // Search effect that triggers on every input change
  useEffect(() => {
    const q = inputValue.trim().toLowerCase();

    if (!q) {
      setFilteredData(tableData);
      return;
    }

    const regex = new RegExp(q, 'i');
    let result;

    // Different search fields based on service type
    if (service === 'EC2') {
      // For EC2, search by IP address
      result = tableData.filter(row =>
        regex.test(row.ip ?? '')
      );
    } else if (service === 'RDS') {
      // For RDS, search by endpoint
      result = tableData.filter(row =>
        regex.test(row.endpoint ?? '')
      );
    } else {
      // Default search by instance name
      result = tableData.filter(row =>
        regex.test(row.instanceName ?? '')
      );
    }

    setFilteredData(result);
  }, [inputValue, tableData, service]);

  // Check if search button should be enabled
  const canSearch = !!provider && !!service && !!region && !loading && (provider !== 'GCP' || !!project);

  // Main search function to fetch resources
  const handleSearch = async () => {
    setLoading(true);
    setError(undefined);
    setTableData([]);
    setFilteredData([]);
    setEnableSearch(true);

    // Get user email for API calls
    let email: string | undefined = undefined;
    try {
      const user = await identityApi.getProfileInfo();
      const normalizedEmail = user.email?.replace(/(\+[^@]+)(?=@)/, '');
      if (normalizedEmail && typeof normalizedEmail === 'string') {
        email = normalizedEmail;
        setUserID(email);
      }
    } catch (err) {
      email = undefined;
    }

    try {
      const backendUrl = await discoveryApi.getBaseUrl('resource-actionhub');

      // Prepare API payload
      const payload: any = {
        provider,
        service,
        account,
        region,
      };
      if (email) payload.userId = email;
      if (provider === 'GCP') payload.project = project

      // Call backend API to fetch resources
      const resp = await fetch(`${backendUrl}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Backend error ${resp.status}`);

      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) {
        setTableData(data.data);
        setFilteredData(data.data);
      } else if (data.error) {
        setError(data.error || 'Backend error');
      } else {
        setError('Unexpected response');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handler for action menu click
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  // Handler for action selection (start/stop/reboot)
  const handleActionClick = async (action: string) => {
    setAnchorEl(null);
    setSelectedRow(null);
    setSnackbarMessage('');
    setSnackbarOpen(false);

    // Prepare action payload
    const payload: any = {
      "account": account,
      "region": provider === 'GCP' ? selectedRow.zone : region,
      "instance_id": selectedRow.instanceName,
      "action": action
    };
    if (userID) payload.userId = userID;
    if (provider === 'GCP') payload.project = project

    if (selectedRow) {
      const messages: Record<string, string> = {
        start: 'starting',
        stop: 'stopping',
        reboot: 'rebooting',
      };
      const errorMessages: Record<string, string> = {
        start: 'started',
        stop: 'stopped',
        reboot: 'rebooted',
      };

      try {
        const backendUrl = await discoveryApi.getBaseUrl('resource-actionhub');

        // Determine which action endpoint to use based on service
        const actionEndpoint = provider === 'GCP' ? 'gcp-action' : service === 'RDS' ? 'rds-action' : 'ec2-action';

        const resp = await fetch(`${backendUrl}/${actionEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error(`Backend error ${resp.status}`);
        setSnackbarOpen(true);
        if (resp.ok) {
          await handleSearch(); // Refresh data after action
          setSeverity('success');
          setSnackbarMessage(`Successfully initiated ${messages[action]}` || 'Unknown action.');
        } else {
          setSeverity('error');
          setSnackbarMessage(`Error: Instance could not be ${errorMessages[action]}. Please verify and retry.`);
        }

        const data = await resp.json();
      } catch (error) {
        setSeverity('error');
        setSnackbarMessage(`Error: Instance could not be ${errorMessages[action]}. Please verify and retry.`);
        setSnackbarOpen(true);
      }
    }
  };

  // Handler to close action menu
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  // Handler to close snackbar notification
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Effect to update filtered data when table data changes
  useEffect(() => {
    setFilteredData(tableData);
  }, [tableData]);

  // Function to clear search input
  const clearSearch = () => {
    setSearchQuery('');
    setInputValue('')
    setFilteredData(tableData);
  };

  // Function to refresh data
  const refreshData = () => {
    handleSearch();
  };

  // Get placeholder text for search based on service type
  const getSearchPlaceholder = () => {
    if (service === 'EC2') {
      return 'Search with IP Address...';
    } else if (service === 'RDS') {
      return 'Search with Endpoint...';
    }
    return 'Search...';
  };

  // Function to fetch available AWS Region
async function fetchRegion(provider: any): Promise<string[]> {
  try {
    if (!provider) {
      return [];
    }
  const backendUrl = await discoveryApi.getBaseUrl('resource-actionhub');

    // Call the API to fetch AWS regions
    const response = await fetch(`${backendUrl}/getAllAwsRegions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify(payload),
      });

    if (!response.ok) {
      throw new Error(`Failed to fetch AWS regions: ${response.status}`);
    }

    const data = await response.json();
     setAllRegions(data);
    
    return [];
  } catch (error) {
    console.error('Error fetching GCP project IDs:', error);
    return [];
  }
}

// Column mapping for display names - updated for RDS
const getColumnDisplayName = (columnKey: string, service: string): string => {
  const columnMap: Record<string, string> = {
    // EC2 columns
    instanceName: service === 'RDS' ? 'Instance Name' : 'Instance Id',
    ip: 'IP Address',
    hostname: 'Hostname',
    status: 'Status',
    // RDS columns
    endpoint: 'Endpoint',
    engine: 'Engine'
  };
  return columnMap[columnKey] || columnKey;
};


  return (
    <Box>
      {/* Form controls section */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-start"
        flexWrap="wrap"
        style={{ marginBottom: 16 }}
      >
        {/* Provider selection dropdown */}
        <FormControl variant="outlined" size="small" style={{ minWidth: 180, marginRight: 16, marginBottom: 8 }}>
          <InputLabel id="provider-label">Provider</InputLabel>
          <Select
            labelId="provider-label"
            value={provider}
            label="Provider"
            onChange={e => {
              setProvider(e.target.value as string);
              setService('');
              setAccount('');
              setProject('');
              setRegion('');
              setAllRegions([]);
              setTableData([]);
              setError(undefined);
            }}
          >
            <MenuItem value="">Select provider</MenuItem>
            <MenuItem value="AWS">AWS</MenuItem>
            {/* <MenuItem value="Azure">Azure</MenuItem>
            <MenuItem value="GCP">GCP</MenuItem> */}
          </Select>
        </FormControl>

        {/* Service selection dropdown - shows only when provider is selected */}
        {showFields && (
          <FormControl variant="outlined" size="small" style={{ minWidth: 180, marginRight: 16, marginBottom: 8 }}>
            <InputLabel id="service-label">{serviceLabel}</InputLabel>
            <Select
              labelId="service-label"
              value={service}
              label={serviceLabel}
              onChange={e => {
                setService(e.target.value as string);
                setAccount('');
                setProject('');
                setRegion('');
              }}
            >
              <MenuItem value="">Select {serviceLabel}</MenuItem>
              {serviceOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        
        {/* Project ID autocomplete - shows only for GCP */}
        {showFields && provider === 'GCP' && (
          <Box style={{ minWidth: 250, marginRight: 16, marginBottom: 8 }}>
            <Autocomplete
              options={projects}
              value={project}
              onChange={(event, newValue) => setProject(newValue || '')}
              disabled={!service || loadingAccounts}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Project ID"
                  placeholder={loadingAccounts ? 'Loading projects...' : 'Select Project ID'}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingAccounts ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText={loadingAccounts ? 'Loading...' : 'No Project ID found'}
              filterOptions={(options, { inputValue }) => {
                return options.filter(option =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              style={{ width: 250 }}
            />
          </Box>
        )}

        {/* Region selection dropdown */}
        {showFields && (
          <FormControl
            variant="outlined"
            size="small"
            style={{ minWidth: 180, marginRight: 16, marginBottom: 8 }}
            disabled={!service}
          >
            <InputLabel id="region-label">{regionLabel}</InputLabel>
            <Select
              labelId="region-label"
              value={region}
              label={regionLabel}
              onChange={e => setRegion(e.target.value as string)}
            >
              <MenuItem value="">Select {regionLabel}</MenuItem>
              {allRegions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Search button */}
        {showFields && (
          <Button
            variant="contained"
            color="primary"
            disabled={!canSearch}
            onClick={handleSearch}
            style={{ minWidth: 90, marginBottom: 8 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
          </Button>
        )}
      </Box>

      {/* Error display */}
      {error && (
        <Box mb={2} color="error.main">
          {error}
        </Box>
      )}

      {/* Search and refresh controls - shows only after search is enabled */}
      {enableSearch &&
        <Box display="flex" justifyContent="flex-end" flexWrap="wrap">
          <Box display="flex" flexWrap="wrap">
            <Tooltip title="Refresh Instances">
              <IconButton
                aria-label="refresh"
                onClick={refreshData}
                className={classes.circularOutline}
              >
               <RefreshIcon style={{ color: '#1473E6' }} />
              </IconButton>
            </Tooltip>
            <TextField
              variant="outlined"
              size="small"
              placeholder={getSearchPlaceholder()}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ minWidth: 300, marginRight: 16, marginBottom: 8 }}
              inputProps={{ 'aria-label': 'Search rows' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: inputValue ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Clear search"
                      edge="end"
                      onClick={clearSearch}
                      size="small"
                      tabIndex={0}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
          </Box>
        </Box>
      }

      {/* Results table section */}
      {enableSearch && (
        filteredData.length === 0 ? (
          <Box mt={4} p={2} textAlign="center" color="#666">
            No records found
          </Box>
        ) : (
          <Box>
            <Box mt={4}>
              {rowCount === 0 ? (
                <Box p={2} textAlign="center" color="#666">
                  No records found
                </Box>
              ) : (
                <>
                  {/* Data table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            style={{
                              border: '1px solid #ddd',
                              textAlign: 'center',
                              padding: 12,
                              backgroundColor: '#1976d2',
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          >
                            {getColumnDisplayName(col, service)}
                          </th>
                        ))}
                        <th
                          style={{
                            border: '1px solid #ddd',
                            textAlign: 'center',
                            padding: 12,
                            backgroundColor: '#1976d2',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr key={start + i}>
                          {columns.map((col, j) => (
                            <td
                              key={j}
                              style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center' }}
                            >
                              {String(row[col] ?? '')}
                            </td>
                          ))}

                          {/* Actions column with menu */}
                          <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'center' }}>
                            <div>
                              <IconButton onClick={(event) => handleClick(event, row)}>
                                <MoreVertIcon />
                              </IconButton>
                              <Menu
                                anchorEl={anchorEl}
                                keepMounted
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                              >
                                {/* Action menu items - conditional based on status */}
                                <MenuItem
                                  disabled={selectedRow && ['running', 'available', 'stopping', 'pending', 'starting', 'configuring-enhanced-monitoring', 'modifying', 'backing-up', 'staging'].includes(selectedRow.status?.toLowerCase())}
                                  onClick={() => handleActionClick('start')}
                                >
                                  Start Instance
                                </MenuItem>
                                <MenuItem
                                  disabled={selectedRow && ['stopped', 'stopped', 'stopping', 'pending', 'starting', 'configuring-enhanced-monitoring', 'modifying', 'backing-up', 'terminated', 'staging'].includes(selectedRow.status?.toLowerCase())}
                                  onClick={() => handleActionClick('stop')}
                                >
                                  Stop Instance
                                </MenuItem>
                                {provider !== 'GCP' && (
                                  <MenuItem
                                    disabled={selectedRow && ['rebooting', 'stopping', 'pending', 'stopped', 'starting', 'configuring-enhanced-monitoring', 'modifying', 'backing-up', 'terminated', 'staging'].includes(selectedRow.status?.toLowerCase())}
                                    onClick={() => handleActionClick('reboot')}
                                  >
                                    Reboot Instance
                                  </MenuItem>
                                )}
                              </Menu>
                              {/* Snackbar for action feedback */}
                              <Snackbar
                                open={snackbarOpen}
                                message={snackbarMessage}
                                ContentProps={{
                                  style: { backgroundColor: severity === 'error' ? 'red' : 'green' }
                                }}
                                autoHideDuration={3000}
                                onClose={handleCloseSnackbar}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination controls */}
                  <Box
                    mt={2}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    style={{ gap: 12, flexWrap: 'wrap' }}
                  >
                    <div style={{ color: '#444' }}>
                      Page {page + 1} of {pageCount} • {rowCount} total records
                    </div>

                    <div>
                      <label htmlFor="rows-per-page" style={{ marginRight: 8 }}>
                        Rows per page:
                      </label>
                      <select
                        id="rows-per-page"
                        value={rowsPerPage}
                        onChange={handleChangeRowsPerPage}
                        style={{ padding: '6px 10px' }}
                      >
                        {[5, 10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        onClick={(e) => handleChangePage(e, Math.max(0, page - 1))}
                        disabled={page === 0}
                        style={{ padding: '6px 10px', marginRight: 8 }}
                      >
                        Prev
                      </button>
                      <button
                        onClick={(e) => handleChangePage(e, Math.min(pageCount - 1, page + 1))}
                        disabled={page >= pageCount - 1}
                        style={{ padding: '6px 10px' }}
                      >
                        Next
                      </button>
                    </div>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        ))}
    </Box>
  );
}