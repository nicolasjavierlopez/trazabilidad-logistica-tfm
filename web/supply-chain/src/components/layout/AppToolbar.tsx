"use client";
import { useState } from "react";
import {
  AppBar, Toolbar, Typography, Button, Box, Chip, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import LanguageIcon from "@mui/icons-material/Language";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { ROLE_LABELS, ROLE_COLORS, UserRole } from "@/lib/constants";

const FLAG: Record<string, string> = { en: "🇺🇸", es: "🇪🇸" };

export default function AppToolbar({
  title = "Trazabilidad Logistica - PFM",
  showConnect = false,
  onConnectClick,
}: {
  title?: string;
  showConnect?: boolean;
  onConnectClick?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { data: userData } = useUserByWallet(address);
  const userRole = userData ? (userData as { role: number }).role as UserRole : UserRole.None;

  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [noMetaMask, setNoMetaMask] = useState(false);

  const handleConnect = () => {
    if (typeof window !== "undefined" && !window.ethereum) {
      setNoMetaMask(true);
      return;
    }
    if (onConnectClick) onConnectClick();
    else { const c = connectors[0]; if (c) connect({ connector: c }); }
  };
  const handleDisconnect = () => { disconnect(); router.push("/login"); };

  return (
    <>
    <AppBar position="static" className="bg-blue-800">
      <Toolbar className="flex justify-between">
        <Box sx={{ flex: 1 }} />
        <Typography variant="h6" sx={{ flex: 1, textAlign: "center" }}>{title}</Typography>
        <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
          {/* Language switcher */}
          <Button
            color="inherit"
            size="small"
            onClick={(e) => setLangAnchor(e.currentTarget)}
            startIcon={<LanguageIcon />}
            sx={{ minWidth: 0, px: 1, textTransform: "none", fontSize: 13 }}
          >
            {FLAG[locale]}
          </Button>
          <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
            <MenuItem
              selected={locale === "en"}
              onClick={() => { setLocale("en"); setLangAnchor(null); }}
            >
              {FLAG.en}&nbsp;&nbsp;{t("langEnglish")}
            </MenuItem>
            <MenuItem
              selected={locale === "es"}
              onClick={() => { setLocale("es"); setLangAnchor(null); }}
            >
              {FLAG.es}&nbsp;&nbsp;{t("langSpanish")}
            </MenuItem>
          </Menu>

          {isConnected && address && !showConnect && (
            <>
              <Chip
                label={ROLE_LABELS[userRole]}
                size="small"
                sx={{
                  bgcolor: ROLE_COLORS[userRole],
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  height: 22,
                }}
              />
              <Chip
                label={address}
                size="small"
                sx={{ fontFamily: "monospace", maxWidth: 420, color: "silver" }}
              />
            </>
          )}
          {showConnect || !isConnected ? (
            <Button color="inherit" startIcon={<AccountBalanceWalletIcon />} onClick={handleConnect}>
              {t("signIn")}
            </Button>
          ) : (
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleDisconnect}>
              {t("signOut")}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>

      {/* MetaMask not installed dialog */}

      <Dialog open={noMetaMask} onClose={() => setNoMetaMask(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
          <AccountBalanceWalletIcon sx={{ color: "warning.main", fontSize: 28 }} />
          {t("noMetaMaskTitle")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("noMetaMaskDesc")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setNoMetaMask(false)} color="inherit" size="small">
            {t("close")}
          </Button>
          <Button
            variant="contained"
            size="small"
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={() => setNoMetaMask(false)}
          >
            {t("noMetaMaskInstall")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
