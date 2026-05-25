"use client";
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Divider, CircularProgress, Alert, Autocomplete,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useSnackbar } from "notistack";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { useTransfersByRecipient, useTokensBatch } from "@/hooks/useRawMaterial";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { RAW_MATERIAL_ADDRESS, UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { Address } from "viem";

interface TransferRequest { id: bigint; tokenId: bigint; from: Address; to: Address; amount: bigint; status: number; createdAt: bigint; }
interface RawToken { id: bigint; name: string; supply: bigint; balance: bigint; features: string; parentId: bigint; creator: Address; createdAt: bigint; }

const PRODUCER_PLACEHOLDER = `{\n    "origin": "Canadá",\n    "quality": "Premium",\n    "certification": "Organic"\n}`;
const FACTORY_PLACEHOLDER = `{\n    "process": "Assembly",\n    "quality": "A",\n    "batch": "2024-001"\n}`;

function ProducerCreateForm() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [supply, setSupply] = useState("");
  const [features, setFeatures] = useState("");
  const [jsonError, setJsonError] = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      enqueueSnackbar(t("tokenCreatedSuccess", { name }), { variant: "success" });
      router.push("/tokens");
    }
  }, [isSuccess]);

  const validateJson = (val: string): boolean => {
    if (!val.trim()) { setJsonError(""); return true; }
    try { JSON.parse(val); setJsonError(""); return true; }
    catch { setJsonError(t("invalidJsonFormat")); return false; }
  };

  const handleCreate = () => {
    if (!name.trim() || !supply) return;
    if (!validateJson(features)) return;
    writeContract({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "createToken", args: [name.trim(), BigInt(supply), features.trim(), 0n] });
  };

  const loading = isPending || isConfirming;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t("createRawMaterialTitle")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t("createRawMaterialDesc")}</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
        <TextField label={t("tokenName")} placeholder={t("enterTokenName")} value={name} onChange={(e) => setName(e.target.value)} fullWidth disabled={loading} />
        <TextField label={t("totalSupply")} placeholder={t("enterTotalSupply")} type="number" value={supply} onChange={(e) => setSupply(e.target.value)} fullWidth disabled={loading} slotProps={{ htmlInput: { min: 1 } }} />
        <TextField
          label={t("featuresJson")} placeholder={PRODUCER_PLACEHOLDER} value={features}
          onChange={(e) => { setFeatures(e.target.value); if (jsonError) validateJson(e.target.value); }}
          onBlur={() => validateJson(features)} fullWidth multiline rows={5} disabled={loading}
          error={!!jsonError} helperText={jsonError || t("optional")}
          slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: 13 } } }}
        />
        <Divider />
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", borderRadius: 2, border: "1px solid #bfdbfe", backgroundColor: "#eff6ff", p: 1.5 }}>
          <InfoOutlinedIcon sx={{ color: "text.secondary", mt: "2px", flexShrink: 0, fontSize: 20 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "medium" }}>{t("creatingAsProducer")}</Typography>
            <Typography variant="caption" color="text.secondary">{t("producerCreateInfo")}</Typography>
          </Box>
        </Box>
        {error && <Alert severity="error" onClose={() => reset()} sx={{ fontSize: 13 }}>{(error as { shortMessage?: string }).shortMessage ?? error.message}</Alert>}
        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => router.push("/dashboard")} disabled={loading}>{t("cancel")}</Button>
          <Button variant="contained" fullWidth onClick={handleCreate} disabled={loading || !name.trim() || !supply} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {loading ? t("processing") : t("createTokenBtn")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function FactoryCreateForm() {
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [supply, setSupply] = useState("");
  const [features, setFeatures] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [parentToken, setParentToken] = useState<RawToken | null>(null);

  const { data: transfersData } = useTransfersByRecipient(address);
  const acceptedTransfers = ((transfersData as TransferRequest[] | undefined) ?? []).filter((tr) => tr.status === 1);
  const parentTokenIds = [...new Set(acceptedTransfers.map((tr) => tr.tokenId))];
  const { data: batchData } = useTokensBatch(parentTokenIds);
  const parentOptions: RawToken[] = (batchData ?? []).map((r) => (r.status === "success" ? (r.result as RawToken) : null)).filter(Boolean) as RawToken[];

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      enqueueSnackbar(t("tokenCreatedSuccess", { name }), { variant: "success" });
      router.push("/tokens");
    }
  }, [isSuccess]);

  const validateJson = (val: string): boolean => {
    if (!val.trim()) { setJsonError(""); return true; }
    try { JSON.parse(val); setJsonError(""); return true; }
    catch { setJsonError(t("invalidJsonFormat")); return false; }
  };

  const handleCreate = () => {
    if (!name.trim() || !supply || !parentToken) return;
    if (!validateJson(features)) return;
    writeContract({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "createToken", args: [name.trim(), BigInt(supply), features.trim(), parentToken.id] });
  };

  const loading = isPending || isConfirming;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t("createProcessedTitle")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t("createProcessedDesc")}</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
        <TextField label={t("tokenName")} placeholder={t("enterTokenName")} value={name} onChange={(e) => setName(e.target.value)} fullWidth disabled={loading} />
        <TextField label={t("totalSupply")} placeholder={t("enterTotalSupply")} type="number" value={supply} onChange={(e) => setSupply(e.target.value)} fullWidth disabled={loading} slotProps={{ htmlInput: { min: 1 } }} />
        <Autocomplete
          options={parentOptions}
          getOptionLabel={(tok) => `#${tok.id} — ${tok.name}`}
          renderOption={(props, tok) => (
            <li {...props} key={tok.id.toString()}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>#{tok.id.toString()} — {tok.name}</Typography>
                <Typography variant="caption" color="text.secondary">Supply: {tok.supply.toLocaleString()}</Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label={t("parentToken")} placeholder="Select parent raw material..."
              helperText={parentOptions.length === 0 ? t("noAcceptedTransfers") : t("tokenBaseFromAccepted")}
              error={parentOptions.length === 0}
            />
          )}
          value={parentToken} onChange={(_, val) => setParentToken(val)}
          disabled={loading} noOptionsText={t("noAcceptedTransfersAvailable")}
        />
        <TextField
          label={t("featuresJson")} placeholder={FACTORY_PLACEHOLDER} value={features}
          onChange={(e) => { setFeatures(e.target.value); if (jsonError) validateJson(e.target.value); }}
          onBlur={() => validateJson(features)} fullWidth multiline rows={5} disabled={loading}
          error={!!jsonError} helperText={jsonError || t("optional")}
          slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: 13 } } }}
        />
        <Divider />
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", borderRadius: 2, border: "1px solid #bfdbfe", backgroundColor: "#eff6ff", p: 1.5 }}>
          <InfoOutlinedIcon sx={{ color: "text.secondary", mt: "2px", flexShrink: 0, fontSize: 20 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "medium" }}>{t("creatingAsFactory")}</Typography>
            <Typography variant="caption" color="text.secondary">{t("factoryCreateInfo")}</Typography>
          </Box>
        </Box>
        {error && <Alert severity="error" onClose={() => reset()} sx={{ fontSize: 13 }}>{(error as { shortMessage?: string }).shortMessage ?? error.message}</Alert>}
        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => router.push("/dashboard")} disabled={loading}>{t("cancel")}</Button>
          <Button variant="contained" fullWidth onClick={handleCreate} disabled={loading || !name.trim() || !supply || !parentToken} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {loading ? t("processing") : t("createTokenBtn")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function CreateTokenPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { t } = useI18n();
  const { data: userData, isLoading: roleLoading } = useUserByWallet(address);
  const role = (userData as { role: number } | undefined)?.role as UserRole | undefined;

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="flex flex-col gap-1 p-8">
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ alignSelf: "flex-start", mb: 1 }}>
              {t("back")}
            </Button>
            {roleLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
            ) : role === UserRole.Factory ? (
              <FactoryCreateForm />
            ) : (
              <ProducerCreateForm />
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
