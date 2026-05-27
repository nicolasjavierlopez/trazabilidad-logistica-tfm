"use client";
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Divider, CircularProgress, Alert, Autocomplete, IconButton, Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutlined";
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
const RETAILER_PLACEHOLDER = `{\n    "brand": "Farma Plus",\n    "category": "Vitamins",\n    "imgUrl": "https://example.com/product.jpg"\n}`;

const INFO_BOX_COLORS = {
  producer: { border: "#bfdbfe", bg: "#eff6ff" },
  factory: { border: "#bfdbfe", bg: "#eff6ff" },
  retailer: { border: "#d1fae5", bg: "#f0fdf4" },
} as const;

function CreateTokenForm({ role }: { role: UserRole }) {
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [supply, setSupply] = useState("");
  const [features, setFeatures] = useState("");
  const [jsonError, setJsonError] = useState("");
  // Array of selected parent tokens; starts with one empty slot for Factory/Retailer
  const [parentTokens, setParentTokens] = useState<(RawToken | null)[]>([null]);

  const showParents = role === UserRole.Factory || role === UserRole.Retailer;

  // Fetch available parent options from accepted incoming transfers
  const { data: transfersData } = useTransfersByRecipient(showParents ? address : undefined);
  const acceptedTransfers = ((transfersData as TransferRequest[] | undefined) ?? []).filter(tr => tr.status === 1);
  const parentTokenIds = [...new Set(acceptedTransfers.map(tr => tr.tokenId))];
  const { data: batchData } = useTokensBatch(parentTokenIds);
  const parentOptions: RawToken[] = (batchData ?? [])
    .map(r => (r.status === "success" ? (r.result as RawToken) : null))
    .filter(Boolean) as RawToken[];

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

  const updateParent = (i: number, val: RawToken | null) =>
    setParentTokens(prev => prev.map((p, idx) => idx === i ? val : p));

  const addParent = () => setParentTokens(prev => [...prev, null]);

  const removeParent = (i: number) =>
    setParentTokens(prev => prev.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    if (!name.trim() || !supply) return;
    if (showParents && !parentTokens[0]) return;
    if (!validateJson(features)) return;

    const primaryParentId = showParents ? (parentTokens[0]?.id ?? 0n) : 0n;
    const additionalIds = showParents
      ? parentTokens.slice(1).filter((t): t is RawToken => t !== null).map(t => t.id.toString())
      : [];

    // Inject additional parents into features JSON
    let finalFeatures = features.trim();
    if (additionalIds.length > 0) {
      try {
        const obj = finalFeatures ? JSON.parse(finalFeatures) : {};
        obj._parentIds = additionalIds;
        finalFeatures = JSON.stringify(obj, null, 2);
      } catch { return; }
    }

    writeContract({
      address: RAW_MATERIAL_ADDRESS,
      abi: RawMaterialAbi,
      functionName: "createToken",
      args: [name.trim(), BigInt(supply), finalFeatures, primaryParentId],
    });
  };

  const loading = isPending || isConfirming;

  const titleKey = role === UserRole.Factory || role === UserRole.Retailer ? "createProcessedTitle" : "createRawMaterialTitle";
  const descKey = role === UserRole.Factory || role === UserRole.Retailer ? "createProcessedDesc" : "createRawMaterialDesc";
  const infoRoleKey = role === UserRole.Factory ? "creatingAsFactory" : role === UserRole.Retailer ? "creatingAsRetailer" : "creatingAsProducer";
  const infoDescKey = role === UserRole.Factory ? "factoryCreateInfo" : role === UserRole.Retailer ? "retailerCreateInfo" : "producerCreateInfo";
  const placeholder = role === UserRole.Factory ? FACTORY_PLACEHOLDER : role === UserRole.Retailer ? RETAILER_PLACEHOLDER : PRODUCER_PLACEHOLDER;
  const boxColors = role === UserRole.Retailer ? INFO_BOX_COLORS.retailer : INFO_BOX_COLORS.factory;

  const canCreate = !loading && !!name.trim() && !!supply &&
    (!showParents || !!parentTokens[0]);

  // Filter out already-selected tokens from options for other selectors
  const getOptions = (currentIndex: number) => {
    const otherSelected = new Set(
      parentTokens.filter((_, i) => i !== currentIndex && _ !== null).map(t => t!.id.toString())
    );
    return parentOptions.filter(t => !otherSelected.has(t.id.toString()));
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t(titleKey)}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t(descKey)}</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
        <TextField
          label={t("tokenName")} placeholder={t("enterTokenName")}
          value={name} onChange={e => setName(e.target.value)} fullWidth disabled={loading}
        />
        <TextField
          label={t("totalSupply")} placeholder={t("enterTotalSupply")}
          type="number" value={supply} onChange={e => setSupply(e.target.value)}
          fullWidth disabled={loading} slotProps={{ htmlInput: { min: 1 } }}
        />

        {/* Multi-parent selectors */}
        {showParents && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("parentTokens")}
            </Typography>

            {parentTokens.map((pt, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={getOptions(i)}
                  getOptionLabel={tok => `#${tok.id} — ${tok.name}`}
                  renderOption={(props, tok) => (
                    <li {...props} key={tok.id.toString()}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          #{tok.id.toString()} — {tok.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Supply: {tok.supply.toLocaleString()}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={i === 0 ? t("parentToken") : `${t("parentToken")} ${i + 1}`}
                      helperText={
                        i === 0
                          ? (parentOptions.length === 0 ? t("noAcceptedTransfers") : t("tokenBaseFromAccepted"))
                          : undefined
                      }
                      error={i === 0 && parentOptions.length === 0}
                    />
                  )}
                  value={pt}
                  onChange={(_, val) => updateParent(i, val)}
                  disabled={loading}
                  noOptionsText={t("noAcceptedTransfersAvailable")}
                />
                {i > 0 && (
                  <Tooltip title="Remove" arrow>
                    <span>
                      <IconButton
                        onClick={() => removeParent(i)}
                        disabled={loading}
                        sx={{ mt: 0.75, color: "error.light" }}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={addParent}
              disabled={loading || parentTokens.length >= parentOptions.length}
              size="small"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            >
              {t("addParent")}
            </Button>
          </Box>
        )}

        <TextField
          label={t("featuresJson")} placeholder={placeholder}
          value={features}
          onChange={e => { setFeatures(e.target.value); if (jsonError) validateJson(e.target.value); }}
          onBlur={() => validateJson(features)}
          fullWidth multiline rows={5} disabled={loading}
          error={!!jsonError} helperText={jsonError || t("optional")}
          slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: 13 } } }}
        />

        <Divider />

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", borderRadius: 2, border: "1px solid", borderColor: boxColors.border, backgroundColor: boxColors.bg, p: 1.5 }}>
          <InfoOutlinedIcon sx={{ color: "text.secondary", mt: "2px", flexShrink: 0, fontSize: 20 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "medium" }}>{t(infoRoleKey)}</Typography>
            <Typography variant="caption" color="text.secondary">{t(infoDescKey)}</Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => reset()} sx={{ fontSize: 13 }}>
            {(error as { shortMessage?: string }).shortMessage ?? error.message}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => router.push("/dashboard")} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained" fullWidth onClick={handleCreate} disabled={!canCreate}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
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
            ) : (
              <CreateTokenForm role={role ?? UserRole.Producer} />
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
