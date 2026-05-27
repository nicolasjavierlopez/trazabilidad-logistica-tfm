"use client";
import { Box, Typography, Card, CardContent, CardActionArea } from "@mui/material";
import TokenIcon from "@mui/icons-material/Token";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PersonIcon from "@mui/icons-material/Person";
import AppToolbar from "@/components/layout/AppToolbar";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

const NAV_CONFIG = [
  { key: "myTokens" as const, Icon: TokenIcon, color: "bg-blue-50", href: "/tokens" },
  { key: "createToken" as const, Icon: AddCircleOutlineOutlinedIcon, color: "bg-green-50", href: "/tokens/create" },
  { key: "transfer" as const, Icon: SwapHorizIcon, color: "bg-amber-50", href: "/transfers" },
  { key: "profileNav" as const, Icon: PersonIcon, color: "bg-purple-50", href: "/profile" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { t } = useI18n();
  const { data: userData } = useUserByWallet(address);
  const role = (userData as { role: number } | undefined)?.role as UserRole | undefined;
  const titleKey = role === UserRole.Factory ? "factoryDashboard" : role === UserRole.Retailer ? "retailerDashboard" : "producerDashboard";

  return (
    <Box className="min-h-screen flex flex-col bg-slate-50">
      <AppToolbar />
      <Box className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 4 }}>{t(titleKey)}</Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {NAV_CONFIG.map(({ key, Icon, color, href }) => (
            <Card key={key} className={color}>
              <CardActionArea onClick={() => router.push(href)}>
                <CardContent className="flex flex-col items-center py-8 gap-3">
                  <Icon sx={{ fontSize: 40 }} color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} align="center">{t(key)}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </div>
      </Box>
    </Box>
  );
}
