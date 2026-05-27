"use client";
import { Box, TextField, Typography, Grid } from "@mui/material";

export interface AddressData {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Props {
  data: AddressData;
  onChange: (data: AddressData) => void;
}

export default function AddressStep({ data, onChange }: Props) {
  const set = (field: keyof AddressData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [field]: e.target.value });

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your shipping address for this order.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField label="Full name" value={data.name} onChange={set("name")} fullWidth required />
        </Grid>
        <Grid size={12}>
          <TextField label="Street address" value={data.street} onChange={set("street")} fullWidth required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="City" value={data.city} onChange={set("city")} fullWidth required />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Postal code" value={data.postalCode} onChange={set("postalCode")} fullWidth required />
        </Grid>
        <Grid size={12}>
          <TextField label="Country" value={data.country} onChange={set("country")} fullWidth required />
        </Grid>
      </Grid>
    </Box>
  );
}
