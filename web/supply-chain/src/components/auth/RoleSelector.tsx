"use client";
import { Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { REGISTERABLE_ROLES, UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

export default function RoleSelector({ onRegister, loading }: { onRegister: (r: UserRole) => void; loading?: boolean }) {
  const [role, setRole] = useState<UserRole>(UserRole.Producer);
  const { t, getRoleLabel } = useI18n();
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardContent className="flex flex-col gap-4 p-6">
        <Typography variant="h5" className="font-bold text-center">{t("selectYourRole")}</Typography>
        <Typography variant="body2" color="text.secondary" className="text-center">{t("selectRoleDesc")}</Typography>
        <FormControl fullWidth>
          <InputLabel>{t("roleLbl")}</InputLabel>
          <Select value={role} label={t("roleLbl")} onChange={(e) => setRole(Number(e.target.value) as UserRole)}>
            {REGISTERABLE_ROLES.map((r) => <MenuItem key={r} value={r}>{getRoleLabel(r)}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" size="large" startIcon={<AccountBalanceWalletIcon />} onClick={() => onRegister(role)} disabled={loading} fullWidth>
          {t("register")}
        </Button>
      </CardContent>
    </Card>
  );
}
