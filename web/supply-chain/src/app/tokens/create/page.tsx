"use client";
import { useState, useEffect, useRef } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Divider, CircularProgress, Alert, Autocomplete, IconButton, Tooltip,
  Table, TableBody, TableHead, TableRow, TableCell, TableContainer,
  Paper, Chip, LinearProgress,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useSnackbar } from "notistack";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { useTransfersByRecipient, useTokensBatch } from "@/hooks/useRawMaterial";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { RAW_MATERIAL_ADDRESS, UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { Address, Abi } from "viem";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransferRequest { id: bigint; tokenId: bigint; from: Address; to: Address; amount: bigint; status: number; createdAt: bigint; }
interface RawToken { id: bigint; name: string; supply: bigint; balance: bigint; features: string; parentId: bigint; creator: Address; createdAt: bigint; }

interface BatchRow {
  name: string;
  supply: string;
  parentId: string;
  additionalParents: string[]; // pipe-separated IDs parsed into array
  features: string;
  validationError?: string;
}

type RowStatus = "idle" | "processing" | "success" | "error";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRODUCER_PLACEHOLDER = `{\n    "origin": "Canadá",\n    "quality": "Premium",\n    "certification": "Organic"\n}`;
const FACTORY_PLACEHOLDER = `{\n    "process": "Assembly",\n    "quality": "A",\n    "batch": "2024-001"\n}`;
const RETAILER_PLACEHOLDER = `{\n    "brand": "Farma Plus",\n    "category": "Vitamins",\n    "imgUrl": "https://example.com/product.jpg"\n}`;

const INFO_BOX_COLORS = {
  factory: { border: "#bfdbfe", bg: "#eff6ff" },
  retailer: { border: "#d1fae5", bg: "#f0fdf4" },
} as const;

// ── CSV helpers ────────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isValidJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

function parseBatchCSV(text: string, showParents: boolean): BatchRow[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ""));
  const get = (cells: string[], key: string) => { const i = header.indexOf(key); return i >= 0 ? (cells[i] ?? "").trim() : ""; };

  return lines.slice(1).map((line): BatchRow => {
    const cells = parseCSVRow(line);
    const name = get(cells, "name");
    const supply = get(cells, "supply");
    const features = get(cells, "features");
    const parentId = showParents ? get(cells, "parentid") : "0";
    const addRaw = showParents ? get(cells, "additionalparentids") : "";
    const additionalParents = addRaw ? addRaw.split("|").map(s => s.trim()).filter(Boolean) : [];

    let validationError: string | undefined;
    if (!name) validationError = "Name is required";
    else if (!supply || isNaN(Number(supply)) || Number(supply) < 1) validationError = "Supply must be a positive number";
    else if (showParents && (!parentId || isNaN(Number(parentId)) || Number(parentId) < 1)) validationError = "parentId must be a positive integer";
    else if (features && !isValidJson(features)) validationError = "features column contains invalid JSON";

    return { name, supply, parentId, additionalParents, features, validationError };
  });
}

function getCSVTemplate(role: UserRole): string {
  if (role === UserRole.Producer) {
    return [
      "name,supply,features",
      `"Raw Cotton Batch 1",1000,"{""origin"":""Canadá"",""quality"":""Premium"",""certification"":""Organic""}"`,
      `"Iron Ore Batch A",5000,"{""grade"":""A"",""purity"":""98%""}"`,
      `"Wheat Harvest 2024",2500,`,
    ].join("\n");
  }
  if (role === UserRole.Factory) {
    return [
      "name,supply,parentId,additionalParentIds,features",
      `"Processed Cotton",500,1,,"{""process"":""Spinning"",""quality"":""A"",""batch"":""2024-001""}"`,
      `"Blended Alloy",200,2,"3|4","{""process"":""Smelting"",""batch"":""2024-002""}"`,
      `"Assembly Kit",100,5,,`,
    ].join("\n");
  }
  return [
    "name,supply,parentId,additionalParentIds,features",
    `"FarmaPlus Vitamins C",200,1,,"{""brand"":""FarmaPlus"",""category"":""Vitamins"",""imgUrl"":""https://example.com/vitamin-c.jpg""}"`,
    `"FarmaPlus Omega 3",150,2,"3|4","{""brand"":""FarmaPlus"",""category"":""Supplements"",""imgUrl"":""https://example.com/omega3.jpg""}"`,
    `"FarmaPlus Zinc 50mg",300,5,,`,
  ].join("\n");
}

function buildRowArgs(row: BatchRow, showParents: boolean): readonly [string, bigint, string, bigint] {
  const primaryParentId = showParents ? BigInt(row.parentId) : 0n;
  let finalFeatures = row.features.trim();
  if (showParents && row.additionalParents.length > 0) {
    const obj = finalFeatures ? JSON.parse(finalFeatures) : {};
    obj._parentIds = row.additionalParents;
    finalFeatures = JSON.stringify(obj);
  }
  return [row.name.trim(), BigInt(row.supply), finalFeatures, primaryParentId];
}

// ── Status icon helper ─────────────────────────────────────────────────────────

function RowStatusIcon({ status, hasError }: { status: RowStatus; hasError?: boolean }) {
  if (hasError) return <WarningAmberIcon sx={{ fontSize: 18, color: "warning.main" }} />;
  if (status === "success") return <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />;
  if (status === "error") return <CancelIcon sx={{ fontSize: 18, color: "error.main" }} />;
  if (status === "processing") return <CircularProgress size={16} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />;
}

// ── Main form component ────────────────────────────────────────────────────────

function CreateTokenForm({ role }: { role: UserRole }) {
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // ── Single-token form state ──────────────────────────────────────────────
  const [name, setName] = useState("");
  const [supply, setSupply] = useState("");
  const [features, setFeatures] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [parentTokens, setParentTokens] = useState<(RawToken | null)[]>([null]);

  const showParents = role === UserRole.Factory || role === UserRole.Retailer;

  const { data: transfersData } = useTransfersByRecipient(showParents ? address : undefined);
  const acceptedTransfers = ((transfersData as TransferRequest[] | undefined) ?? []).filter(tr => tr.status === 1);
  const parentTokenIds = [...new Set(acceptedTransfers.map(tr => tr.tokenId))];
  const { data: batchData } = useTokensBatch(parentTokenIds);
  const parentOptions: RawToken[] = (batchData ?? [])
    .map(r => (r.status === "success" ? (r.result as RawToken) : null))
    .filter(Boolean) as RawToken[];

  const { writeContract, data: hash, isPending, error: txError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !batchRunning) {
      enqueueSnackbar(t("tokenCreatedSuccess", { name }), { variant: "success" });
      router.push("/tokens");
    }
  }, [isSuccess]);

  // ── Batch state ──────────────────────────────────────────────────────────
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchStatus, setBatchStatus] = useState<RowStatus[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validBatchRows = batchRows.filter(r => !r.validationError);
  const invalidCount = batchRows.length - validBatchRows.length;

  // ── Single-token handlers ─────────────────────────────────────────────────

  const validateJson = (val: string): boolean => {
    if (!val.trim()) { setJsonError(""); return true; }
    try { JSON.parse(val); setJsonError(""); return true; }
    catch { setJsonError(t("invalidJsonFormat")); return false; }
  };

  const updateParent = (i: number, val: RawToken | null) =>
    setParentTokens(prev => prev.map((p, idx) => idx === i ? val : p));
  const addParent = () => setParentTokens(prev => [...prev, null]);
  const removeParent = (i: number) => setParentTokens(prev => prev.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    if (!name.trim() || !supply) return;
    if (showParents && !parentTokens[0]) return;
    if (!validateJson(features)) return;

    const primaryParentId = showParents ? (parentTokens[0]?.id ?? 0n) : 0n;
    const additionalIds = showParents
      ? parentTokens.slice(1).filter((t): t is RawToken => t !== null).map(t => t.id.toString())
      : [];

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

  // ── Batch handlers ────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const content = getCSVTemplate(role);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla-${UserRole[role].toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseBatchCSV(text, showParents);
      setBatchRows(rows);
      setBatchStatus(rows.map(() => "idle"));
      setBatchDone(0);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const startBatch = async () => {
    if (!publicClient || !walletClient || !address || batchRunning) return;
    if (validBatchRows.length === 0) return;

    setBatchRunning(true);
    setBatchDone(0);
    // Pre-mark invalid rows as error so they show clearly
    setBatchStatus(batchRows.map(r => r.validationError ? "error" : "idle"));

    let done = 0;
    for (let i = 0; i < batchRows.length; i++) {
      const row = batchRows[i];
      if (row.validationError) continue; // skip invalid rows

      setBatchStatus(prev => { const n = [...prev]; n[i] = "processing"; return n; });

      try {
        const args = buildRowArgs(row, showParents);

        const { request } = await publicClient.simulateContract({
          address: RAW_MATERIAL_ADDRESS,
          abi: RawMaterialAbi as Abi,
          functionName: "createToken",
          args,
          account: address,
        });

        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        setBatchStatus(prev => { const n = [...prev]; n[i] = "success"; return n; });
        done++;
        setBatchDone(done);
      } catch (e) {
        const msg = (e as { shortMessage?: string }).shortMessage ?? (e as Error).message ?? "Unknown error";
        setBatchStatus(prev => { const n = [...prev]; n[i] = "error"; return n; });
        enqueueSnackbar(`Row ${i + 1}: ${msg.slice(0, 100)}`, { variant: "error" });
        break; // stop on first error
      }
    }

    setBatchRunning(false);
    if (done > 0) enqueueSnackbar(t("batchComplete", { count: String(done) }), { variant: "success" });
  };

  const clearBatch = () => {
    setBatchRows([]);
    setBatchStatus([]);
    setBatchDone(0);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const singleLoading = isPending || isConfirming;
  const canCreate = !singleLoading && !batchRunning && !!name.trim() && !!supply &&
    (!showParents || !!parentTokens[0]);

  const getOptions = (currentIndex: number) => {
    const otherSelected = new Set(
      parentTokens.filter((_, i) => i !== currentIndex && _ !== null).map(t => t!.id.toString())
    );
    return parentOptions.filter(t => !otherSelected.has(t.id.toString()));
  };

  const titleKey = showParents ? "createProcessedTitle" : "createRawMaterialTitle";
  const descKey = showParents ? "createProcessedDesc" : "createRawMaterialDesc";
  const infoRoleKey = role === UserRole.Factory ? "creatingAsFactory" : role === UserRole.Retailer ? "creatingAsRetailer" : "creatingAsProducer";
  const infoDescKey = role === UserRole.Factory ? "factoryCreateInfo" : role === UserRole.Retailer ? "retailerCreateInfo" : "producerCreateInfo";
  const placeholder = role === UserRole.Factory ? FACTORY_PLACEHOLDER : role === UserRole.Retailer ? RETAILER_PLACEHOLDER : PRODUCER_PLACEHOLDER;
  const boxColors = role === UserRole.Retailer ? INFO_BOX_COLORS.retailer : INFO_BOX_COLORS.factory;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Single-token form ── */}
      <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t(titleKey)}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t(descKey)}</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
        <TextField
          label={t("tokenName")} placeholder={t("enterTokenName")}
          value={name} onChange={e => setName(e.target.value)} fullWidth disabled={singleLoading || batchRunning}
        />
        <TextField
          label={t("totalSupply")} placeholder={t("enterTotalSupply")}
          type="number" value={supply} onChange={e => setSupply(e.target.value)}
          fullWidth disabled={singleLoading || batchRunning} slotProps={{ htmlInput: { min: 1 } }}
        />

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
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>#{tok.id.toString()} — {tok.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Supply: {tok.supply.toLocaleString()}</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={i === 0 ? t("parentToken") : `${t("parentToken")} ${i + 1}`}
                      helperText={i === 0 ? (parentOptions.length === 0 ? t("noAcceptedTransfers") : t("tokenBaseFromAccepted")) : undefined}
                      error={i === 0 && parentOptions.length === 0}
                    />
                  )}
                  value={pt}
                  onChange={(_, val) => updateParent(i, val)}
                  disabled={singleLoading || batchRunning}
                  noOptionsText={t("noAcceptedTransfersAvailable")}
                />
                {i > 0 && (
                  <Tooltip title="Remove" arrow>
                    <span>
                      <IconButton onClick={() => removeParent(i)} disabled={singleLoading || batchRunning} sx={{ mt: 0.75, color: "error.light" }}>
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />} onClick={addParent} size="small" variant="outlined"
              disabled={singleLoading || batchRunning || parentTokens.length >= parentOptions.length}
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
          fullWidth multiline rows={4} disabled={singleLoading || batchRunning}
          error={!!jsonError} helperText={jsonError || t("optional")}
          slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: 13 } } }}
        />

        <Divider />

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", borderRadius: 2, border: "1px solid", borderColor: showParents ? boxColors.border : "#bfdbfe", backgroundColor: showParents ? boxColors.bg : "#eff6ff", p: 1.5 }}>
          <InfoOutlinedIcon sx={{ color: "text.secondary", mt: "2px", flexShrink: 0, fontSize: 20 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "medium" }}>{t(infoRoleKey)}</Typography>
            <Typography variant="caption" color="text.secondary">{t(infoDescKey)}</Typography>
          </Box>
        </Box>

        {txError && (
          <Alert severity="error" onClose={() => reset()} sx={{ fontSize: 13 }}>
            {(txError as { shortMessage?: string }).shortMessage ?? txError.message}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="outlined" fullWidth onClick={() => router.push("/dashboard")} disabled={singleLoading || batchRunning}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained" fullWidth onClick={handleCreate} disabled={!canCreate}
            startIcon={singleLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {singleLoading ? t("processing") : t("createTokenBtn")}
          </Button>
        </Box>
      </Box>

      {/* ── Batch upload section ── */}
      <Divider sx={{ my: 4 }}>
        <Chip label={t("batchUpload")} size="small" variant="outlined" />
      </Divider>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange} />
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={batchRunning}
          size="small"
        >
          {t("uploadCsv")}
        </Button>
        <Button
          variant="text"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
          disabled={batchRunning}
          size="small"
          color="inherit"
        >
          {t("downloadTemplate")}
        </Button>

        {batchRows.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {t("batchRowsLoaded", { count: String(batchRows.length) })}
            {invalidCount > 0 && (
              <Box component="span" sx={{ color: "warning.main", ml: 1 }}>
                · {t("batchValidationErrors", { count: String(invalidCount) })}
              </Box>
            )}
          </Typography>
        )}
      </Box>

      {/* Batch preview table */}
      {batchRows.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <TableContainer component={Paper} elevation={1} sx={{ maxHeight: 320, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50", fontSize: "0.75rem" } }}>
                  <TableCell sx={{ width: 40 }}>{t("batchColStatus")}</TableCell>
                  <TableCell>{t("batchColName")}</TableCell>
                  <TableCell align="right">{t("batchColSupply")}</TableCell>
                  {showParents && <TableCell>{t("batchColParents")}</TableCell>}
                  <TableCell sx={{ maxWidth: 200 }}>{t("batchColFeatures")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {batchRows.map((row, i) => (
                  <TableRow
                    key={i}
                    sx={{
                      bgcolor: row.validationError ? "warning.50" : batchStatus[i] === "error" ? "error.50" : batchStatus[i] === "success" ? "success.50" : "inherit",
                      opacity: row.validationError ? 0.8 : 1,
                    }}
                  >
                    <TableCell>
                      <RowStatusIcon status={batchStatus[i] ?? "idle"} hasError={!!row.validationError} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.name || "—"}</Typography>
                      {row.validationError && (
                        <Typography variant="caption" color="warning.dark" sx={{ display: "block", fontSize: "0.68rem" }}>
                          {row.validationError}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{row.supply}</Typography>
                    </TableCell>
                    {showParents && (
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                          {row.parentId && row.parentId !== "0" ? `#${row.parentId}` : "—"}
                          {row.additionalParents.length > 0 && ` +${row.additionalParents.length}`}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden" }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.secondary" }}>
                        {row.features || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Progress bar during batch */}
          {batchRunning && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={validBatchRows.length > 0 ? (batchDone / validBatchRows.length) * 100 : 0}
                sx={{ borderRadius: 1, height: 6 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {t("batchProgress", { done: String(batchDone), total: String(validBatchRows.length) })}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1.5, mt: 2, alignItems: "center" }}>
            <Button
              variant="contained"
              onClick={startBatch}
              disabled={batchRunning || validBatchRows.length === 0 || singleLoading}
              startIcon={batchRunning ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {batchRunning
                ? t("batchRunning")
                : t("batchCreateAll", { count: String(validBatchRows.length) })}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={clearBatch}
              disabled={batchRunning}
              size="small"
            >
              {t("batchClear")}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
        <Card sx={{ width: "100%", maxWidth: 680, boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ alignSelf: "flex-start", mb: 2 }}>
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
