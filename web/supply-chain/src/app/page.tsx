"use client";
import { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, Button, Alert,
  CircularProgress, Divider,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
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
  const [isPending, setIsPending] = useState(false); // account awaiting approval

  const {
    data: isRegistered,
    isFetching: regFetching,
    refetch: refetchReg,
  } = useIsRegistered(address);

  const {
    data: user,
    isFetching: userFetching,
    refetch: refetchUser,
  } = useUserByWallet(address);

  const { writeContract, isPending: txPending, isConfirming, isSuccess, reset } = useRegistryWrite();

  const isLoading = regFetching || userFetching;

  // Reset local state whenever the wallet address changes
  useEffect(() => {
    setShowRoleSelect(false);
    setIsPending(false);
  }, [address]);

  // Route or show registration flow once fresh data is available
  useEffect(() => {
    // Don't act while queries are still fetching (avoids stale-data routing on account switch)
    if (!isConnected || !address || isLoading) return;

    const anvilRole = ANVIL_ROLE_MAP[address.toLowerCase()];

    if (isRegistered === false) {
      // Not in the registry — show role selector (unless it's an Anvil auto-register account)
      if (!anvilRole) setShowRoleSelect(true);
      return;
    }

    if (isRegistered && user) {
      const u = user as { role: number; status: number };
      if (u.status === UserStatus.Pending) {
        setIsPending(true);
        setShowRoleSelect(false);
        return;
      }
      if (u.status === UserStatus.Approved) {
        enqueueSnackbar(t("sessionStarted"), { variant: "success" });
        router.replace(ROLE_ROUTES[u.role as UserRole] || "/");
      }
    }
  }, [isConnected, address, isRegistered, user, isLoading]);

  // Auto-register Anvil test accounts
  useEffect(() => {
    if (!isConnected || !address || isRegistered !== false || isLoading) return;
    const anvilRole = ANVIL_ROLE_MAP[address.toLowerCase()];
    if (!anvilRole || anvilRole === UserRole.Admin) return;
    writeContract({
      address: USER_REGISTRY_ADDRESS,
      abi: UserRegistryAbi,
      functionName: "register",
      args: [anvilRole],
    });
  }, [isConnected, address, isRegistered, isLoading]);

  // After registration tx succeeds — refetch and check status
  useEffect(() => {
    if (!isSuccess) return;
    refetchReg();
    refetchUser();
    reset();
    setShowRoleSelect(false);
    setIsPending(true);
  }, [isSuccess]);

  const handleConnect = () => {
    const c = connectors[0];
    if (c) connect({ connector: c });
  };

  const handleRegister = (role: UserRole) => {
    writeContract({
      address: USER_REGISTRY_ADDRESS,
      abi: UserRegistryAbi,
      functionName: "register",
      args: [role],
    });
  };

  const registering = txPending || isConfirming;

  // ── Pending approval state ─────────────────────────────────────────────
  if (isPending) {
    return (
      <Box className="min-h-screen flex flex-col bg-slate-50">
        <AppToolbar showConnect onConnectClick={handleConnect} />
        <Box className="flex-1 flex flex-col items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, p: 5, textAlign: "center" }}>
              <Box sx={{ bgcolor: "warning.50", border: "1px solid", borderColor: "warning.200", borderRadius: "50%", p: 2 }}>
                <HourglassEmptyIcon sx={{ fontSize: 40, color: "warning.main" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {t("pendingApprovalTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("pendingApprovalDesc")}
                </Typography>
              </Box>
              <Alert severity="info" sx={{ width: "100%", textAlign: "left", fontSize: 13 }}>
                {t("registrationSuccess")}
              </Alert>
              {address && (
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                  {address}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  // ── Role selector for new users ────────────────────────────────────────
  if (showRoleSelect && isConnected) {
    return (
      <Box className="min-h-screen flex flex-col bg-slate-50">
        <AppToolbar showConnect onConnectClick={handleConnect} />
        <Box className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <AccountBalanceWalletIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    {t("welcome")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {address?.slice(0, 8)}…{address?.slice(-6)}
                  </Typography>
                </Box>
              </Box>
              <Alert severity="info" sx={{ mb: 3, fontSize: 13 }}>
                {t("welcomeNewUser")}
              </Alert>
              <Divider sx={{ mb: 3 }} />
              <RoleSelector onRegister={handleRegister} loading={registering} />
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  // ── Default: connect wallet ────────────────────────────────────────────
  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar showConnect onConnectClick={handleConnect} />
      <Box className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, p: 5 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{t("welcome")}</Typography>
              <Typography variant="body2" color="text.secondary">{t("connectMetaMask")}</Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={
                isLoading && isConnected
                  ? <CircularProgress size={18} color="inherit" />
                  : <AccountBalanceWalletIcon />
              }
              onClick={handleConnect}
              disabled={connecting || registering || (isLoading && isConnected)}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {isLoading && isConnected ? t("processing") : t("signIn")}
            </Button>

            {isConnected && address && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: "monospace", wordBreak: "break-all", textAlign: "center" }}
              >
                {address}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
