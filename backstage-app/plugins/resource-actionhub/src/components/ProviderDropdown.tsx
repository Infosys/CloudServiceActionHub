import { useState, ChangeEvent } from 'react';
import { FormControl, InputLabel, MenuItem, Select, Box } from '@material-ui/core';

const providerOptions = [
  { value: 'AWS', label: 'AWS', services: [{ value: 'EC2', label: 'EC2' }] },
  { value: 'Azure', label: 'Azure', services: [{ value: 'VM', label: 'VM' }] }, ];

export default function ProviderDropdown(props: {
  onProviderChange?: (provider: string) => void;
  onServiceChange?: (service: string) => void;
}) {
  const [provider, setProvider] = useState<string>('');
  const [service, setService] = useState<string>('');

  const handleProviderChange = (event: ChangeEvent<{ value: unknown }>) => {
    const nextProvider = event.target.value as string;
    setProvider(nextProvider);
    setService(''); // Reset service when provider changes
    props.onProviderChange?.(nextProvider);
    props.onServiceChange?.(''); // Reset service selection on change
  };

  const handleServiceChange = (event: ChangeEvent<{ value: unknown }>) => {
    const nextService = event.target.value as string;
    setService(nextService);
    props.onServiceChange?.(nextService);
  };

  const serviceOptions = provider
    ? providerOptions.find(p => p.value === provider)?.services ?? []
    : [];

  return (
    <Box display="flex" style={{ marginBottom: 16 }}>
      <FormControl variant="outlined" size="small" style={{ minWidth:
180, marginRight: 16 }}>
        <InputLabel id="provider-label">Provider</InputLabel>
        <Select
          labelId="provider-label"
          value={provider}
          label="Provider"
          onChange={handleProviderChange}
        >
          <MenuItem value="">Select provider</MenuItem>
          {providerOptions.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl
        variant="outlined"
        size="small"
        style={{ minWidth: 180 }}
        disabled={!provider}
      >
        <InputLabel id="service-label">Service</InputLabel>
        <Select
          labelId="service-label"
          value={service}
          label="Service"
          onChange={handleServiceChange}
        >
          <MenuItem value="">Select service</MenuItem>
          {serviceOptions.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
