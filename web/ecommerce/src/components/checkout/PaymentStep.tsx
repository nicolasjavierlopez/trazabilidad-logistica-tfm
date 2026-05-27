"use client";
import { useState, useRef, useEffect } from "react";
import {
  Box, TextField, Typography, Grid, Button, Divider, Alert,
  ToggleButton, ToggleButtonGroup, CircularProgress,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import Invoice from "./Invoice";
import type { InvoiceData } from "./Invoice";
import { useI18n } from "@/lib/i18n";

interface Props {
  invoiceData: InvoiceData;
  onComplete: () => void;
}

type PayMethod = "wallet" | "card";

export default function PaymentStep({ invoiceData, onComplete }: Props) {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [payMethod, setPayMethod] = useState<PayMethod>("wallet");
  const [confirmed, setConfirmed] = useState(false);
  const [cardPlacing, setCardPlacing] = useState(false);

  // Wallet payment via MetaMask
  const { sendTransaction, data: txHash, isPending: txPending, error: txError } = useSendTransaction();
  const { isLoading: txConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess && !confirmed) {
      setConfirmed(true);
      onComplete();
    }
  }, [txSuccess]);

  const handleWalletPay = () => {
    if (!address) return;
    // Send 0-value transaction to the connected address (MetaMask permission demo)
    sendTransaction({ to: address, value: 0n });
  };

  const handleCardPay = () => {
    setCardPlacing(true);
    setTimeout(() => {
      setCardPlacing(false);
      setConfirmed(true);
      onComplete();
    }, 1400);
  };

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice #${invoiceData.orderNumber} — FarmaPlus</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #111; font-size: 14px; }
            svg { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { padding: 8px 12px; border-bottom: 1px solid #eee; text-align: left; }
            th { background: #e8f5e9; color: #1b5e20; font-weight: 700; }
            hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
            .MuiTypography-root { line-height: 1.5; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const isWalletBusy = txPending || txConfirming;
  const canWalletPay = isConnected && !!address && !isWalletBusy && !confirmed;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Confirmed banner */}
      {confirmed && (
        <Alert icon={<CheckCircleOutlineIcon />} severity="success" sx={{ fontWeight: 600 }}>
          {t("orderConfirmed")}
        </Alert>
      )}

      {/* Payment method selector + form */}
      {!confirmed && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              {t("paymentMethod")}
            </Typography>
            <ToggleButtonGroup
              value={payMethod}
              exclusive
              onChange={(_, v) => { if (v) setPayMethod(v); }}
              size="small"
              color="primary"
              fullWidth
            >
              <ToggleButton value="wallet" sx={{ gap: 1, fontWeight: 600 }}>
                <AccountBalanceWalletIcon fontSize="small" />
                {t("payWithWallet")}
              </ToggleButton>
              <ToggleButton value="card" sx={{ gap: 1, fontWeight: 600 }}>
                <CreditCardIcon fontSize="small" />
                {t("payWithCard")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Wallet payment */}
          {payMethod === "wallet" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {isConnected && address ? (
                <>
                  <Alert severity="info" icon={<AccountBalanceWalletIcon />}>
                    <Typography variant="body2">{t("walletPayInfo")}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", mt: 0.5, wordBreak: "break-all" }}>
                      {address}
                    </Typography>
                  </Alert>
                  {txError && (
                    <Alert severity="error" sx={{ fontSize: 13 }}>
                      {(txError as { shortMessage?: string }).shortMessage ?? txError.message}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleWalletPay}
                    disabled={!canWalletPay}
                    startIcon={isWalletBusy ? <CircularProgress size={18} color="inherit" /> : <AccountBalanceWalletIcon />}
                    sx={{ fontWeight: 700, py: 1.5 }}
                  >
                    {txPending
                      ? t("txPending")
                      : txConfirming
                        ? t("txConfirming")
                        : t("finalizeOrder")}
                  </Button>
                </>
              ) : (
                <Alert severity="warning">{t("walletNotConnected")}</Alert>
              )}
            </Box>
          )}

          {/* Card payment */}
          {payMethod === "card" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">{t("paymentSimulated")}</Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField label={t("cardholderName")} fullWidth placeholder="Name as on card" />
                </Grid>
                <Grid size={12}>
                  <TextField label={t("cardNumber")} fullWidth placeholder="1234 5678 9012 3456"
                    slotProps={{ htmlInput: { maxLength: 19 } }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField label={t("expiry")} fullWidth placeholder="MM/YY" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField label={t("cvv")} fullWidth placeholder="123" type="password" />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCardPay}
                disabled={cardPlacing}
                startIcon={cardPlacing ? <CircularProgress size={18} color="inherit" /> : <CreditCardIcon />}
                sx={{ fontWeight: 700, py: 1.5, mt: 1 }}
              >
                {cardPlacing ? t("processing") : t("placeOrder")}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      {/* Invoice preview */}
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold" }}>
            {t("invoicePreview")}
          </Typography>
          <Button startIcon={<PrintIcon />} size="small" variant="outlined" onClick={handlePrint}>
            {t("printSavePdf")}
          </Button>
        </Box>
        <Invoice ref={invoiceRef} data={invoiceData} />
      </Box>
    </Box>
  );
}
