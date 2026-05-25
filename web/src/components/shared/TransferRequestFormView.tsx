"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Button, Card, CardContent, TextField,
  CircularProgress, Alert, Autocomplete, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonIcon from "@mui/icons-material/Person";
import AppToolbar from "@/components/layout/AppToolbar";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSnackbar } from "notistack";
import { useAllUsers } from "@/hooks/useUserRegistry";
import { useToken, useRawMaterialWrite } from "@/hooks/useRawMaterial";
import { RAW_MATERIAL_ADDRESS, UserRole, UserStatus } from "@/lib/constants";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { useI18n } from "@/lib/i18n";
import type { Address } from "viem";

type UserRow = { wallet: Address; role: number; status: number; registeredAt: bigint; txCount: bigint };
interface RawToken { id: bigint; name: string; balance: bigint; parentId: bigint; supply: bigint; features: string; creator: Address; createdAt: bigint; }
function truncate(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

interface Props {
  senderRole: UserRole;
  recipientRole: UserRole;
}

export default function TransferRequestFormView({ senderRole, recipientRole }: Props) {
  const { id: tokenId } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t, locale, getRoleLabel } = useI18n();

  const tokenIdBig = tokenId ? BigInt(tokenId) : undefined;
  const { data: tokenData, isLoading: tokenLoading } = useToken(tokenIdBig);
  const token = tokenData as RawToken | undefined;

  const { data: allUsersData } = useAllUsers();
  const recipients = ((allUsersData as UserRow[] | undefined) ?? []).filter(
    (u) => u.role === recipientRole && u.status === UserStatus.Approved
  );

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const { writeContract, isPending, isConfirming, isSuccess, error, reset } = useRawMaterialWrite();

  useEffect(() => {
    if (isSuccess) {
      enqueueSnackbar(t("transferCreatedSuccess"), { variant: "success" });
      router.push("/transfers");
    }
  }, [isSuccess, router]);

  const maxBalance = token ? Number(token.balance) : 0;
  const amountNum = parseInt(amount, 10);
  const amountValid = !isNaN(amountNum) && amountNum > 0 && amountNum <= maxBalance;
  const loading = isPending || isConfirming;

  const handleSubmit = () => {
    if (!selected || !tokenIdBig || !amountValid) return;
    writeContract({
      address: RAW_MATERIAL_ADDRESS,
      abi: RawMaterialAbi,
      functionName: "createTransferRequest",
      args: [selected.wallet, tokenIdBig, BigInt(amountNum)],
    });
  };

  const recipientLabel = getRoleLabel(recipientRole);
  const senderLabel = getRoleLabel(senderRole);

  const recipientInputLabel = locale === "en"
    ? `${recipientLabel} recipient`
    : `Destinatario ${recipientLabel}`;
  const recipientPlaceholder = locale === "en"
    ? `Search ${recipientLabel.toLowerCase()} address...`
    : `Buscar dirección ${recipientLabel.toLowerCase()}...`;
  const noRecipientsText = locale === "en"
    ? `No ${recipientLabel.toLowerCase()}s available`
    : `No hay ${recipientLabel.toLowerCase()}s disponibles`;

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/tokens")} sx={{ mb: 3 }}>
          {t("back")}
        </Button>
        <Typography variant="h5" className="font-bold" sx={{ mb: 3 }}>{t("transferTokenTitle")}</Typography>

        {tokenLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

        {!tokenLoading && token && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" className="font-bold">{t("transferRules")}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonIcon color="action" />
                  <Box>
                    <Typography variant="body2" className="font-bold">{address ? truncate(address) : "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{senderLabel}</Typography>
                  </Box>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t("youCanTransferTo")}</Typography>
                  <Typography variant="body2" className="font-bold">
                    {recipientLabel}s ({recipients.length} {t("available")})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t("tokenLbl")} </Typography>
                  <Typography variant="caption" className="font-bold">{token.name}</Typography>
                  <Typography variant="caption" color="text.secondary"> · {t("availableBalance")} </Typography>
                  <Typography variant="caption" className="font-bold">{token.balance.toLocaleString()}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box>
                  <Typography variant="h6" className="font-bold">{t("sendTransferRequest")}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t("recipientMustAccept")}
                  </Typography>
                </Box>

                <Autocomplete
                  options={recipients}
                  getOptionLabel={(r) => r.wallet}
                  renderOption={(props, r) => (
                    <li {...props} key={r.wallet}>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{r.wallet}</Typography>
                        <Typography variant="caption" color="text.secondary">{recipientLabel}</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label={recipientInputLabel} placeholder={recipientPlaceholder} />
                  )}
                  value={selected}
                  onChange={(_, val) => setSelected(val)}
                  disabled={loading}
                  noOptionsText={noRecipientsText}
                  filterOptions={(opts, { inputValue }) =>
                    opts.filter((o) => o.wallet.toLowerCase().includes(inputValue.toLowerCase()))
                  }
                />

                <TextField
                  label={t("amountLabel")} placeholder={t("enterAmount")} type="number"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  fullWidth disabled={loading}
                  helperText={`${t("maximum")} ${maxBalance.toLocaleString()} tokens`}
                  error={amount !== "" && !amountValid}
                  slotProps={{ htmlInput: { min: 1, max: maxBalance } }}
                />

                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 2, p: 2 }}>
                  <WarningAmberIcon sx={{ color: "#d97706", flexShrink: 0, mt: "2px" }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "#92400e" }}>{t("importantTitle")}</Typography>
                    <Typography variant="caption" sx={{ color: "#78350f" }}>{t("importantWarning")}</Typography>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="error" onClose={reset} sx={{ fontSize: 13 }}>
                    {(error as { shortMessage?: string }).shortMessage ?? error.message}
                  </Alert>
                )}

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button variant="outlined" fullWidth onClick={() => router.push("/tokens")} disabled={loading}>
                    {t("cancel")}
                  </Button>
                  <Button variant="contained" fullWidth onClick={handleSubmit} disabled={!selected || !amountValid || loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
                    {loading ? t("processing") : t("sendRequestBtn")}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}
