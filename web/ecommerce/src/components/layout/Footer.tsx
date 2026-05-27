"use client";
import { Box, Typography, Divider } from "@mui/material";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <Box component="footer" sx={{ mt: "auto" }}>
      <Divider />
      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 0.5, py: 3, px: 2,
        bgcolor: "primary.dark",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
          <LocalPharmacyIcon sx={{ fontSize: 16, color: "primary.light" }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: 0.5 }}>
            Farma<span style={{ color: "#a5d6a7" }}>Plus</span>
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
          {t("footerText")}
        </Typography>
      </Box>
    </Box>
  );
}
