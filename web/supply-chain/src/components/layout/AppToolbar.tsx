"use client";
import { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Box, Chip, Menu, MenuItem } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import LanguageIcon from "@mui/icons-material/Language";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

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

  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  const handleConnect = () => {
    if (onConnectClick) onConnectClick();
    else { const c = connectors[0]; if (c) connect({ connector: c }); }
  };
  const handleDisconnect = () => { disconnect(); router.push("/login"); };

  return (
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
            <Chip
              label={address}
              size="small"
              sx={{ fontFamily: "monospace", maxWidth: 420, color: "silver" }}
            />
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
  );
}
