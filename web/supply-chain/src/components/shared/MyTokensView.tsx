"use client";
import { useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  CircularProgress, Alert, TablePagination, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import AppToolbar from "@/components/layout/AppToolbar";
import TraceabilityDialog from "@/components/shared/TraceabilityDialog";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { RAW_MATERIAL_ADDRESS } from "@/lib/constants";
import { useReceivedBalancesBatch } from "@/hooks/useRawMaterial";
import { useI18n } from "@/lib/i18n";
import type { Address } from "viem";

interface RawToken {
  id: bigint;
  creator: Address;
  name: string;
  supply: bigint;
  balance: bigint;
  features: string;
  parentId: bigint;
  createdAt: bigint;
}

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://etherscan.io";

export default function MyTokensView() {
  const router = useRouter();
  const { address } = useAccount();
  const { t, formatDate } = useI18n();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getTokensByOwner",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const tokens = (data as RawToken[] | undefined) ?? [];

  // Received tokens: creator is someone else
  const receivedTokenIds = tokens.filter((t) => t.creator.toLowerCase() !== address?.toLowerCase()).map((t) => t.id);
  const { data: receivedBalancesData } = useReceivedBalancesBatch(receivedTokenIds, address);
  const receivedBalances = (receivedBalancesData as bigint[] | undefined) ?? [];
  const receivedBalanceMap = new Map<string, bigint>(
    receivedTokenIds.map((id, i) => [id.toString(), receivedBalances[i] ?? 0n])
  );

  const getDisplayBalance = (token: RawToken): bigint =>
    token.creator.toLowerCase() !== address?.toLowerCase()
      ? (receivedBalanceMap.get(token.id.toString()) ?? 0n)
      : token.balance;

  const isReceived = (token: RawToken) =>
    token.creator.toLowerCase() !== address?.toLowerCase();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginated = tokens.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuToken, setMenuToken] = useState<RawToken | null>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>, tok: RawToken) => { setMenuAnchor(e.currentTarget); setMenuToken(tok); };
  const closeMenu = () => { setMenuAnchor(null); setMenuToken(null); };
  const [detailToken, setDetailToken] = useState<RawToken | null>(null);
  const [traceTokenId, setTraceTokenId] = useState<bigint | null>(null);

  let detailFeaturesObj: Record<string, unknown> | null = null;
  if (detailToken?.features) {
    try {
      const parsed = JSON.parse(detailToken.features);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        detailFeaturesObj = parsed as Record<string, unknown>;
      }
    } catch { /* not valid JSON */ }
  }

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ mb: 3 }}>
          {t("back")}
        </Button>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>{t("myTokens")}</Typography>
            <Typography variant="body2" color="text.secondary">{t("myTokensSubtitle")}</Typography>
          </Box>
          <Button variant="contained" onClick={() => router.push("/tokens/create")}>
            {t("createTokenShort")}
          </Button>
        </Box>

        {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}
        {isError && (
          <Alert severity="error" action={<Button onClick={() => refetch()}>{t("retry")}</Button>}>
            {t("couldNotLoadTokens")}
          </Alert>
        )}
        {!isLoading && !isError && tokens.length === 0 && (
          <Card><CardContent sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">{t("noTokensYet")}</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push("/tokens/create")}>
              {t("createFirstToken")}
            </Button>
          </CardContent></Card>
        )}

        {tokens.length > 0 && (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
                  <TableCell>{t("colContractNo")}</TableCell>
                  <TableCell>{t("colName")}</TableCell>
                  <TableCell align="right">{t("colSupply")}</TableCell>
                  <TableCell align="right">{t("colBalance")}</TableCell>
                  <TableCell>{t("colCreatedAt")}</TableCell>
                  <TableCell align="center">{t("colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((token) => {
                  const received = isReceived(token);
                  const displayBalance = getDisplayBalance(token);
                  return (
                    <TableRow key={token.id.toString()} hover>
                      <TableCell>
                        <Chip label={`#${token.id}`} size="small" color="primary" variant="outlined" sx={{ fontFamily: "monospace" }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>{token.name}</Typography>
                            {token.parentId > 0n && !received && (
                              <Typography variant="caption" color="text.secondary">
                                {t("parentLabel")} #{token.parentId.toString()}
                              </Typography>
                            )}
                          </Box>
                          {received && (
                            <Tooltip title={t("externalSource")} arrow>
                              <Box sx={{
                                display: "flex", alignItems: "center", gap: 0.5,
                                bgcolor: "success.50", border: "1px solid", borderColor: "success.200",
                                borderRadius: 1, px: 0.75, py: 0.25,
                              }}>
                                <CallReceivedIcon sx={{ fontSize: 13, color: "success.700" }} />
                                <Typography variant="caption" sx={{ color: "success.700", fontWeight: 600, lineHeight: 1, fontSize: "0.68rem" }}>
                                  {t("externalSource")}
                                </Typography>
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{token.supply.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{displayBalance.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {formatDate(token.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={(e) => openMenu(e, token)}><MoreHorizIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={tokens.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage={t("perPage")}
            />
          </TableContainer>
        )}

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
          <MenuItem onClick={() => { if (menuToken) setDetailToken(menuToken); closeMenu(); }}>
            <VisibilityIcon sx={{ fontSize: 18, mr: 1 }} />{t("viewDetail")}
          </MenuItem>
          <MenuItem onClick={() => { if (menuToken) setTraceTokenId(menuToken.id); closeMenu(); }}>
            <AccountTreeIcon sx={{ fontSize: 18, mr: 1 }} />{t("viewTraceability")}
          </MenuItem>
          <MenuItem onClick={() => { window.open(`${EXPLORER_URL}/address/${RAW_MATERIAL_ADDRESS}`, "_blank"); closeMenu(); }}>
            <OpenInNewIcon sx={{ fontSize: 18, mr: 1 }} />{t("goToEtherscan")}
          </MenuItem>
          <MenuItem onClick={() => { if (menuToken) router.push(`/tokens/${menuToken.id.toString()}/transfer`); closeMenu(); }}>
            <SwapHorizIcon sx={{ fontSize: 18, mr: 1 }} />{t("transferTokenMenu")}
          </MenuItem>
        </Menu>

        {/* Traceability Dialog */}
        <TraceabilityDialog
          tokenId={traceTokenId}
          onClose={() => setTraceTokenId(null)}
        />

        {/* Token Detail Modal */}
        <Dialog open={!!detailToken} onClose={() => setDetailToken(null)} maxWidth="sm" fullWidth>
          {detailToken && (() => {
            const received = isReceived(detailToken);
            const displayBalance = getDisplayBalance(detailToken);
            return (
              <>
                <DialogTitle sx={{ p: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>{detailToken.name}</Typography>
                      {received && (
                        <Tooltip title={t("externalSource")} arrow>
                          <Box sx={{
                            display: "flex", alignItems: "center", gap: 0.5,
                            bgcolor: "success.50", border: "1px solid", borderColor: "success.200",
                            borderRadius: 1, px: 0.75, py: 0.25,
                          }}>
                            <CallReceivedIcon sx={{ fontSize: 13, color: "success.700" }} />
                            <Typography variant="caption" sx={{ color: "success.700", fontWeight: 600, fontSize: "0.68rem" }}>
                              {t("externalSource")}
                            </Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{
                      bgcolor: received ? "rgba(46, 125, 50, 0.10)" : "rgba(25, 118, 210, 0.10)",
                      borderRadius: "50%", width: 52, height: 52,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {received
                        ? <CallReceivedIcon sx={{ color: "success.main", fontSize: 28 }} />
                        : <Inventory2Icon sx={{ color: "primary.main", fontSize: 28 }} />}
                    </Box>
                  </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold", display: "block", mb: 1.5 }}>
                    {t("tokenAttributes")}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
                    {[
                      { label: t("attrId"), value: `#${detailToken.id}` },
                      { label: t("attrCreator"), value: `${detailToken.creator.slice(0, 6)}...${detailToken.creator.slice(-4)}` },
                      { label: t("colSupply"), value: detailToken.supply.toLocaleString() },
                      { label: received ? t("receivedBalanceLbl") : t("colBalance"), value: displayBalance.toLocaleString() },
                      { label: t("colCreatedAt"), value: formatDate(detailToken.createdAt) },
                      ...(detailToken.parentId > 0n ? [{ label: t("parentLabel"), value: `#${detailToken.parentId}` }] : []),
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>{label}</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", textAlign: "right", wordBreak: "break-all" }}>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold", display: "block", mb: 1.5 }}>
                    {t("characteristics")}
                  </Typography>
                  {detailFeaturesObj ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
                          <TableCell>{t("featKey")}</TableCell>
                          <TableCell>{t("featValue")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(detailFeaturesObj).map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell sx={{ fontFamily: "monospace", fontWeight: 500 }}>{k}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace" }}>
                              {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t("noCharacteristics")}</Typography>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                  <Button variant="contained" onClick={() => setDetailToken(null)}>{t("close")}</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>
      </Box>
    </Box>
  );
}
