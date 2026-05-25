"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  CircularProgress, Alert, TablePagination,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSnackbar } from "notistack";
import { useTransfersBySender, useTokensByOwner, useRawMaterialWrite } from "@/hooks/useRawMaterial";
import { RAW_MATERIAL_ADDRESS } from "@/lib/constants";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { useI18n } from "@/lib/i18n";
import type { Address } from "viem";

interface TransferRequest {
  id: bigint; tokenId: bigint; from: Address; to: Address;
  amount: bigint; status: number; createdAt: bigint;
}
interface RawToken { id: bigint; name: string; }

function truncate(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }

export default function TransferHistoryView() {
  const router = useRouter();
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const { t, formatDate, getTransferStatusLabel } = useI18n();

  const { data: transfersData, isLoading, isError, refetch } = useTransfersBySender(address);
  const { data: tokensData } = useTokensByOwner(address);
  const transfers = (transfersData as TransferRequest[] | undefined) ?? [];
  const tokenMap = new Map<string, string>(
    ((tokensData as RawToken[] | undefined) ?? []).map((tok) => [tok.id.toString(), tok.name])
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const paginated = transfers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const { writeContract, isPending, isConfirming, isSuccess, reset } = useRawMaterialWrite();
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);

  const handleCancel = (id: bigint) => {
    setCancellingId(id);
    writeContract({ address: RAW_MATERIAL_ADDRESS, abi: RawMaterialAbi, functionName: "cancelTransfer", args: [id] });
  };

  useEffect(() => {
    if (isSuccess) {
      enqueueSnackbar(t("transferCancelled"), { variant: "info" });
      setCancellingId(null); reset(); refetch();
    }
  }, [isSuccess]);

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ mb: 3 }}>
          {t("back")}
        </Button>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" className="font-bold">{t("transfersTitle")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("transfersSentDesc")}</Typography>
        </Box>

        {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}
        {isError && (
          <Alert severity="error" action={<Button onClick={() => refetch()}>{t("retry")}</Button>}>
            {t("couldNotLoadTransfers")}
          </Alert>
        )}
        {!isLoading && !isError && transfers.length === 0 && (
          <Card><CardContent sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">{t("noTransfersYet")}</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push("/tokens")}>
              {t("viewMyTokens")}
            </Button>
          </CardContent></Card>
        )}

        {transfers.length > 0 && (
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
                {paginated.map((tr) => {
                  const isCancelling = cancellingId === tr.id && (isPending || isConfirming);
                  return (
                    <TableRow key={tr.id.toString()} hover>
                      <TableCell>
                        <Chip label={`#${tr.id}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-bold">
                          {tokenMap.get(tr.tokenId.toString()) ?? `Token #${tr.tokenId}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }} title={tr.to}>{truncate(tr.to)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{tr.amount.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTransferStatusLabel(tr.status)}
                          size="small"
                          color={([undefined, "warning", "success", "default", "error"] as const)[tr.status + 1] ?? "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {formatDate(tr.createdAt)}
                        </Typography>
                      </TableCell>
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
            <TablePagination
              component="div" count={transfers.length} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage={t("perPage")}
            />
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
