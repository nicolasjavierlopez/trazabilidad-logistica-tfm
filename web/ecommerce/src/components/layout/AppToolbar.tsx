"use client";
import { useState } from "react";
import {
  AppBar, Toolbar, Typography, Box, IconButton, Button,
  Badge, Tooltip, Avatar, Menu, MenuItem, Chip, useMediaQuery, useTheme,
  ListItemIcon, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import LanguageIcon from "@mui/icons-material/Language";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { injected } from "wagmi/connectors";
import { useCart } from "@/context/CartContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useRouter, usePathname } from "next/navigation";
import CartDrawer from "./CartDrawer";

function truncate(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

const NAV_ITEMS = [
  { key: "navProducts" as const, href: "/" },
  { key: "navAbout" as const, href: "/about" },
  { key: "navFaqs" as const, href: "/faqs" },
];

export default function AppToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { totalQty } = useCart();
  const { t, locale, setLocale } = useI18n();
  const [cartOpen, setCartOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [noMetaMask, setNoMetaMask] = useState(false);

  const handleConnect = () => {
    if (typeof window !== "undefined" && !window.ethereum) {
      setNoMetaMask(true);
      return;
    }
    connect({ connector: injected() });
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const switchLocale = (l: Locale) => { setLocale(l); setLangAnchor(null); };

  const networkName = chainId === 11155111 ? "Sepolia" : chainId === 31337 ? "Anvil" : `Chain ${chainId}`;

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 1500);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.dark", borderBottom: "1px solid", borderColor: "primary.main" }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          {/* Brand */}
          <Box
            onClick={() => router.push("/")}
            sx={{ display: "flex", alignItems: "center", gap: 0.75, cursor: "pointer", flexShrink: 0, mr: 1 }}
          >
            <LocalPharmacyIcon sx={{ fontSize: 26, color: "primary.light" }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
              Farma<span style={{ color: "#a5d6a7" }}>Plus</span>
            </Typography>
          </Box>

          {/* Nav links */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 0.25, flex: 1 }}>
              {NAV_ITEMS.map(({ key, href }) => (
                <Button
                  key={key}
                  onClick={() => router.push(href)}
                  sx={{
                    color: isActive(href) ? "#fff" : "rgba(255,255,255,0.72)",
                    fontWeight: isActive(href) ? 700 : 500,
                    fontSize: "0.875rem",
                    borderBottom: isActive(href) ? "2px solid #a5d6a7" : "2px solid transparent",
                    borderRadius: 0,
                    px: 1.5,
                    "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
                  }}
                >
                  {t(key)}
                </Button>
              ))}
            </Box>
          )}

          {isMobile && <Box sx={{ flex: 1 }} />}

          {/* Language switcher */}
          <Tooltip title={t("langEn") + " / " + t("langEs")} arrow>
            <IconButton onClick={(e) => setLangAnchor(e.currentTarget)} size="small" sx={{ color: "rgba(255,255,255,0.75)" }}>
              <LanguageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
            <MenuItem selected={locale === "en"} onClick={() => switchLocale("en")}>{t("langEn")}</MenuItem>
            <MenuItem selected={locale === "es"} onClick={() => switchLocale("es")}>{t("langEs")}</MenuItem>
          </Menu>

          {/* Cart */}
          <Tooltip title={t("cart")} arrow>
            <IconButton onClick={() => setCartOpen(true)} sx={{ color: "#fff" }}>
              <Badge badgeContent={totalQty} color="secondary" max={99}>
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User section */}
          {isConnected && address ? (
            <>
              <Tooltip title={networkName} arrow>
                <Chip
                  label={networkName}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.12)", color: "#a5d6a7",
                    fontWeight: 700, fontSize: "0.68rem", height: 22,
                    display: { xs: "none", sm: "flex" },
                  }}
                />
              </Tooltip>
              <Tooltip title={copiedAddr ? t("copied") : address} arrow>
                <Button
                  onClick={(e) => setUserAnchor(e.currentTarget)}
                  variant="outlined"
                  size="small"
                  startIcon={
                    <Avatar sx={{ width: 20, height: 20, bgcolor: "primary.light", fontSize: 9, fontWeight: 800 }}>
                      {address.slice(2, 4).toUpperCase()}
                    </Avatar>
                  }
                  sx={{
                    color: "#fff", borderColor: "rgba(255,255,255,0.4)",
                    "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
                    textTransform: "none", fontFamily: "monospace", fontSize: "0.78rem",
                    flexShrink: 0,
                  }}
                >
                  {truncate(address)}
                </Button>
              </Tooltip>
              <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)}>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t("network")}: {networkName}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all", maxWidth: 220 }}>{address}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { handleCopyAddress(); setUserAnchor(null); }}>
                  <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                  {copiedAddr ? t("copied") : t("copyAddress")}
                </MenuItem>
                <MenuItem onClick={() => { disconnect(); setUserAnchor(null); }} sx={{ color: "error.main" }}>
                  <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                  {t("signOut")}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleConnect}
              sx={{ bgcolor: "primary.light", "&:hover": { bgcolor: "#388e3c" }, color: "#fff", fontWeight: 700, flexShrink: 0 }}
            >
              {t("signIn")}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

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
