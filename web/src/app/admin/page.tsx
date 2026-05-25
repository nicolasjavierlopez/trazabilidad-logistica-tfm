"use client";
import { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, List, ListItem, ListItemText, IconButton, Menu, MenuItem, Chip, TablePagination } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import AppToolbar from "@/components/layout/AppToolbar";
import { useAllUsers, useUserCount, useRegistryWrite } from "@/hooks/useUserRegistry";
import UserRegistryAbi from "@/abi/UserRegistry.json";
import { USER_REGISTRY_ADDRESS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import type { UserStatus } from "@/lib/constants";

type UserRow = { wallet: string; role: number; status: number; registeredAt: bigint; txCount: bigint };
const STATUS_COLORS: Record<number, "default" | "warning" | "success" | "error"> = { 0: "default", 1: "warning", 2: "success", 3: "error" };

export default function AdminPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { t, getRoleLabel, getUserStatusLabel } = useI18n();
  const { data: users, refetch } = useAllUsers();
  const { data: counts, refetch: refetchCounts } = useUserCount();
  const { writeContract, isSuccess, reset } = useRegistryWrite();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const userList = (users as UserRow[] | undefined) ?? [];
  const paginatedUsers = userList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const [total, pending, approved, rejected] = (counts as [bigint, bigint, bigint, bigint] | undefined) ?? [BigInt(0), BigInt(0), BigInt(0), BigInt(0)];

  const handleAction = (action: string, idx: number) => {
    const fn = action === "approve" ? "approveUser" : action === "reject" ? "rejectUser" : "setPending";
    writeContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: fn, args: [BigInt(idx + 1)] });
    setMenuAnchor(null);
  };

  useEffect(() => {
    if (!isSuccess) return;
    refetch(); refetchCounts(); enqueueSnackbar(t("operationCompleted"), { variant: "success" }); reset();
  }, [isSuccess]);

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="bg-blue-50"><CardContent><Typography variant="body2">{t("totalUsers")}</Typography><Typography variant="h4">{total.toString()}</Typography></CardContent></Card>
          <Card className="bg-amber-50"><CardContent><Typography variant="body2">{t("statsPending")}</Typography><Typography variant="h4" className="text-amber-700">{pending.toString()}</Typography></CardContent></Card>
          <Card className="bg-green-50"><CardContent><Typography variant="body2">{t("statsApproved")}</Typography><Typography variant="h4" className="text-green-700">{approved.toString()}</Typography></CardContent></Card>
          <Card className="bg-red-50"><CardContent><Typography variant="body2">{t("statsRejected")}</Typography><Typography variant="h4" className="text-red-700">{rejected.toString()}</Typography></CardContent></Card>
        </div>
        <Card><CardContent>
          <Typography variant="h6" className="mb-3 font-bold">{t("registeredUsers")}</Typography>
          <List>{paginatedUsers.map((u, localIdx) => {
            const globalIdx = page * rowsPerPage + localIdx;
            return (
              <ListItem key={u.wallet} divider secondaryAction={<IconButton onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedIndex(globalIdx); }}><MoreHorizIcon /></IconButton>}>
                <ListItemText
                  primary={
                    <Box className="flex flex-wrap gap-2 items-center">
                      <Typography className="font-bold">User #{globalIdx + 1}</Typography>
                      <Chip label={getUserStatusLabel(u.status as UserStatus)} size="small" color={STATUS_COLORS[u.status]} />
                      <Chip label={getRoleLabel(u.role)} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={<Typography className="font-mono">{u.wallet}</Typography>}
                />
              </ListItem>
            );
          })}</List>
          <TablePagination
            component="div"
            count={userList.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage={t("perPage")}
          />
        </CardContent></Card>
      </Box>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => selectedIndex !== null && handleAction("approve", selectedIndex)}>{t("approveAction")}</MenuItem>
        <MenuItem onClick={() => selectedIndex !== null && handleAction("reject", selectedIndex)}>{t("rejectAction")}</MenuItem>
        <MenuItem onClick={() => selectedIndex !== null && handleAction("pending", selectedIndex)}>{t("setPending")}</MenuItem>
        <MenuItem onClick={() => { if (selectedIndex !== null) router.push(`/admin/users/${selectedIndex + 1}`); setMenuAnchor(null); }}>{t("viewUser")}</MenuItem>
      </Menu>
    </Box>
  );
}
