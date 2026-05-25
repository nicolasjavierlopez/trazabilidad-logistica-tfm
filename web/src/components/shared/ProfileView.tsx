"use client";
import { Box, Card, CardContent, Typography, Button, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function ProfileView() {
  const router = useRouter();
  const { address } = useAccount();
  const { t, getRoleLabel } = useI18n();
  const { data: userData } = useUserByWallet(address);
  const role = (userData as { role: number } | undefined)?.role as UserRole ?? UserRole.None;

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard")} sx={{ mb: 3 }}>
          {t("back")}
        </Button>
        <Card className="max-w-md">
          <CardContent className="flex flex-col gap-3 p-6">
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>{t("profileTitle")}</Typography>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("roleProfile")}</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={getRoleLabel(role)} color="primary" size="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("walletLabel")}</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", mt: 0.5 }}>{address}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
