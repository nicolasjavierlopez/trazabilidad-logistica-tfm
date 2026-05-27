"use client";
import { Box, Card, CardContent, Typography, List, ListItem, ListItemText, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useRouter } from "next/navigation";
import AppToolbar from "@/components/layout/AppToolbar";
import { useUser, useUserTransactions } from "@/hooks/useUserRegistry";
import { useI18n } from "@/lib/i18n";
import type { UserRole, UserStatus } from "@/lib/constants";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, formatDate, getRoleLabel, getUserStatusLabel } = useI18n();
  const userId = BigInt(params.id as string);
  const { data: user } = useUser(userId);
  const { data: transactions } = useUserTransactions(userId);
  const u = user as { wallet: string; role: number; status: number; registeredAt: bigint; txCount: bigint } | undefined;
  const txs = (transactions as { txHash: string; timestamp: bigint; action: string }[] | undefined) ?? [];

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/admin")} className="mb-4">
          {t("back")}
        </Button>
        <Card className="mb-4"><CardContent>
          <Typography variant="h5" className="font-bold">{t("userDetail")}</Typography>
          {u && (
            <>
              <Typography className="font-mono break-all">{u.wallet}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("registeredAt")} {formatDate(u.registeredAt)}
              </Typography>
              <Typography variant="body2">
                {t("roleDetail")} {getRoleLabel(u.role as UserRole)} - {getUserStatusLabel(u.status as UserStatus)}
              </Typography>
              <Typography variant="h6" className="mt-2">
                {t("totalTransactions")} {u.txCount.toString()}
              </Typography>
            </>
          )}
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="h6" className="mb-3 font-bold">{t("history")}</Typography>
          <List>
            {txs.length === 0 && <ListItem><ListItemText primary={t("noTransactions")} /></ListItem>}
            {txs.map((tx, i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={tx.action}
                  secondary={<>{formatDate(tx.timestamp)}<br /><span className="font-mono">{String(tx.txHash)}</span></>}
                />
              </ListItem>
            ))}
          </List>
        </CardContent></Card>
      </Box>
    </Box>
  );
}
