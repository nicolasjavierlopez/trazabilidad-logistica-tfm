"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  CircularProgress, Alert, TablePagination, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InboxIcon from "@mui/icons-material/Inbox";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSnackbar } from "notistack";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import {
  useTransfersBySender, useTransfersByRecipient,
  useTokensByOwner, useTokensBatch, useRawMaterialWrite,
} from "@/hooks/useRawMaterial";
import { RAW_MATERIAL_ADDRESS, UserRole } from "@/lib/constants";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { useI18n } from "@/lib/i18n";
import type { Address } from "viem";

interface TransferRequest { id: bigint; tokenId: bigint; from: Address; to: Address; amount: bigint; status: number; createdAt: bigint; }
interface RawToken { id: bigint; name: string; }

function truncate(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

export default function TransfersPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t, formatDate, getTransferStatusLabel } = useI18n();

  const { data: userData } = useUserByWallet(address);
  const role = (userData as { role: number } | undefined)?.role as UserRole | undefined;
  const isFactory = role === UserRole.Factory || role === UserRole.Retailer;

  // ── Outgoing transfers (all roles) ──────────────────────────────────────
  const { data: outData, isLoading: outLoading, isError: outError, refetch: refetchOut } = useTransfersBySender(address);
  const { data: tokensData } = useTokensByOwner(address);
  const outgoing = (outData as TransferRequest[] | undefined) ?? [];
  const tokenMap = new Map<string, string>(
    ((tokensData as RawToken[] | undefined) ?? []).map((tok) => [tok.id.toString(), tok.name])
  );
  const [outPage, setOutPage] = useState(0);
  const [outRpp, setOutRpp] = useState(5);
  const paginatedOut = outgoing.slice(outPage * outRpp, outPage * outRpp + outRpp);

  const { writeContract: cancelFn, isPending: cancelPending, isConfirming: cancelConfirming, isSuccess: cancelSuccess, reset: cancelReset } = useRawMaterialWrite();
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);

  const handleCancel = (id: bigint) => {
    setCancellingId(id);
    cancelFn({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "cancelTransfer", args: [id] });
  };

  useEffect(() => {
    if (cancelSuccess) { enqueueSnackbar(t("transferCancelled"), { variant: "info" }); setCancellingId(null); cancelReset(); refetchOut(); }
  }, [cancelSuccess]);

  // ── Incoming pending (Factory only) ─────────────────────────────────────
  const { data: inData, isLoading: inLoading, isError: inError, refetch: refetchIn } = useTransfersByRecipient(address);
  const allIncoming = (inData as TransferRequest[] | undefined) ?? [];
  const pendingIn = allIncoming.filter((tr) => tr.status === 0);
  const parentIds = [...new Set(pendingIn.map((tr) => tr.tokenId))];
  const { data: batchData } = useTokensBatch(parentIds);
  const inTokenMap = new Map<string, string>(
    (batchData ?? [])
      .map((r, i) => r.status === "success" ? [parentIds[i].toString(), (r.result as RawToken).name] as [string, string] : null)
      .filter(Boolean) as [string, string][]
  );
  const [inPage, setInPage] = useState(0);
  const [inRpp, setInRpp] = useState(5);
  const paginatedIn = pendingIn.slice(inPage * inRpp, inPage * inRpp + inRpp);

  const { writeContract: actionFn, isPending: actPending, isConfirming: actConfirming, isSuccess: actSuccess, reset: actReset } = useRawMaterialWrite();
  const [processing, setProcessing] = useState<{ id: bigint; action: "accept" | "reject" } | null>(null);

  const handleAccept = (id: bigint) => { setProcessing({ id, action: "accept" }); actionFn({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "acceptTransfer", args: [id] }); };
  const handleReject = (id: bigint) => { setProcessing({ id, action: "reject" }); actionFn({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "rejectTransfer", args: [id] }); };

  useEffect(() => {
    if (actSuccess) {
      const msg = processing?.action === "accept" ? t("acceptTransfer") : t("rejectTransfer");
      enqueueSnackbar(msg, { variant: processing?.action === "accept" ? "success" : "info" });
      setProcessing(null); actReset(); refetchIn();
    }
  }, [actSuccess]);

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ mb: 3 }}>
          {t("back")}
        </Button>

        {/* Pending incoming — Factory only */}
        {isFactory && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <InboxIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>{t("pendingIncomingTransfers")}</Typography>
              {pendingIn.length > 0 && <Chip label={pendingIn.length} size="small" color="warning" />}
            </Box>

            {inLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
            {inError && <Alert severity="error" action={<Button onClick={() => refetchIn()}>{t("retry")}</Button>} sx={{ mb: 2 }}>{t("couldNotLoadTransfers")}</Alert>}

            {!inLoading && !inError && pendingIn.length === 0 && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ textAlign: "center", py: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <InboxIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                  <Typography color="text.secondary">{t("noCheckableItems")}</Typography>
                </CardContent>
              </Card>
            )}

            {pendingIn.length > 0 && (
              <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
                      <TableCell>{t("colId")}</TableCell>
                      <TableCell>{t("colToken")}</TableCell>
                      <TableCell>{t("colFrom")}</TableCell>
                      <TableCell align="right">{t("colAmount")}</TableCell>
                      <TableCell>{t("colDate")}</TableCell>
                      <TableCell align="center">{t("colActions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedIn.map((tr) => {
                      const isProc = processing?.id === tr.id && (actPending || actConfirming);
                      return (
                        <TableRow key={tr.id.toString()} hover>
                          <TableCell><Chip label={`#${tr.id}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} /></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: "bold" }}>{inTokenMap.get(tr.tokenId.toString()) ?? `Token #${tr.tokenId}`}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }} title={tr.from}>{truncate(tr.from)}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{tr.amount.toLocaleString()}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatDate(tr.createdAt)}</Typography></TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                              <Button size="small" variant="contained" color="success" disabled={isProc} onClick={() => handleAccept(tr.id)}>
                                {isProc && processing?.action === "accept" ? <CircularProgress size={14} color="inherit" /> : t("acceptTransfer")}
                              </Button>
                              <Button size="small" variant="outlined" color="error" disabled={isProc} onClick={() => handleReject(tr.id)}>
                                {isProc && processing?.action === "reject" ? <CircularProgress size={14} /> : t("rejectTransfer")}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination component="div" count={pendingIn.length} page={inPage}
                  onPageChange={(_, p) => setInPage(p)} rowsPerPage={inRpp}
                  onRowsPerPageChange={(e) => { setInRpp(parseInt(e.target.value, 10)); setInPage(0); }}
                  rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage={t("perPage")} />
              </TableContainer>
            )}
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Outgoing history — all roles */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t("transfersTitle")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("transfersSentDesc")}</Typography>
        </Box>

        {outLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}
        {outError && <Alert severity="error" action={<Button onClick={() => refetchOut()}>{t("retry")}</Button>}>{t("couldNotLoadTransfers")}</Alert>}

        {!outLoading && !outError && outgoing.length === 0 && (
          <Card><CardContent sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">{t("noTransfersYet")}</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push("/tokens")}>{t("viewMyTokens")}</Button>
          </CardContent></Card>
        )}

        {outgoing.length > 0 && (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
                  <TableCell>{t("colId")}</TableCell>
                  <TableCell>{t("colToken")}</TableCell>
                  <TableCell>{t("colRecipient")}</TableCell>
                  <TableCell align="right">{t("colAmount")}</TableCell>
                  <TableCell>{t("colStatus")}</TableCell>
                  <TableCell>{t("colDate")}</TableCell>
                  <TableCell align="center">{t("colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOut.map((tr) => {
                  const isCancelling = cancellingId === tr.id && (cancelPending || cancelConfirming);
                  return (
                    <TableRow key={tr.id.toString()} hover>
                      <TableCell><Chip label={`#${tr.id}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} /></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: "bold" }}>{tokenMap.get(tr.tokenId.toString()) ?? `Token #${tr.tokenId}`}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }} title={tr.to}>{truncate(tr.to)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{tr.amount.toLocaleString()}</Typography></TableCell>
                      <TableCell>
                        <Chip label={getTransferStatusLabel(tr.status)} size="small"
                          color={([undefined, "warning", "success", "default", "error"] as const)[tr.status + 1] ?? "default"} />
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatDate(tr.createdAt)}</Typography></TableCell>
                      <TableCell align="center">
                        {tr.status === 0 && (
                          <Button size="small" color="error" variant="outlined" disabled={isCancelling} onClick={() => handleCancel(tr.id)}>
                            {isCancelling ? <CircularProgress size={14} /> : t("cancelTransferBtn")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination component="div" count={outgoing.length} page={outPage}
              onPageChange={(_, p) => setOutPage(p)} rowsPerPage={outRpp}
              onRowsPerPageChange={(e) => { setOutRpp(parseInt(e.target.value, 10)); setOutPage(0); }}
              rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage={t("perPage")} />
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
