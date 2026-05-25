"use client";
import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Button, Alert } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import AppToolbar from "@/components/layout/AppToolbar";
import RoleSelector from "@/components/auth/RoleSelector";
import { useIsRegistered, useUserByWallet, useRegistryWrite } from "@/hooks/useUserRegistry";
import UserRegistryAbi from "@/abi/UserRegistry.json";
import { ANVIL_ROLE_MAP, ROLE_ROUTES, USER_REGISTRY_ADDRESS, UserRole, UserStatus } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { data: isRegistered, refetch: refetchReg } = useIsRegistered(address);
  const { data: user, refetch: refetchUser } = useUserByWallet(address);
  const { writeContract, isPending, isConfirming, isSuccess, reset } = useRegistryWrite();

  const handleConnect = () => { const c = connectors[0]; if (c) connect({ connector: c }); };

  useEffect(() => {
    if (!isConnected || !address) { setShowRoleSelect(false); return; }
    const anvilRole = ANVIL_ROLE_MAP[address.toLowerCase()];
    if (isRegistered === false) { setShowRoleSelect(!anvilRole); return; }
    if (isRegistered && user) {
      const u = user as { role: number; status: number };
      if (u.status === UserStatus.Pending) { setRegistrationSuccess(true); return; }
      if (u.status === UserStatus.Approved) router.replace(ROLE_ROUTES[u.role as UserRole] || "/");
    }
  }, [isConnected, address, isRegistered, user, router]);

  useEffect(() => {
    if (!isSuccess) return;
    refetchReg(); refetchUser(); reset();
    const u = user as { status: number; role: number } | undefined;
    if (u?.status === UserStatus.Approved && address) {
      enqueueSnackbar(t("sessionStarted"), { variant: "success" });
      router.replace(ROLE_ROUTES[u.role as UserRole]);
    } else { setRegistrationSuccess(true); setShowRoleSelect(false); }
  }, [isSuccess]);

  useEffect(() => {
    if (!isConnected || !address || isRegistered !== false) return;
    const anvilRole = ANVIL_ROLE_MAP[address.toLowerCase()];
    if (!anvilRole || anvilRole === UserRole.Admin) return;
    writeContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "register", args: [anvilRole] });
  }, [isConnected, address, isRegistered]);

  const handleRegister = (role: UserRole) => {
    writeContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "register", args: [role] });
  };

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar showConnect onConnectClick={handleConnect} />
      <Box className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {registrationSuccess && (
          <Alert severity="info" className="max-w-md w-full">{t("registrationSuccess")}</Alert>
        )}
        {showRoleSelect && isConnected ? (
          <RoleSelector onRegister={handleRegister} loading={isPending || isConfirming} />
        ) : (
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <Typography variant="h5" className="font-bold">{t("welcome")}</Typography>
              <Typography color="text.secondary" className="text-center">{t("connectMetaMask")}</Typography>
              <Button
                variant="contained" size="large" startIcon={<AccountBalanceWalletIcon />}
                onClick={handleConnect} disabled={connecting || isPending || isConfirming} fullWidth
              >
                {t("signIn")}
              </Button>
              {isConnected && address && (
                <Typography variant="caption" className="font-mono break-all">{address}</Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
