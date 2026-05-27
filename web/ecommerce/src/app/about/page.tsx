"use client";
import { Box, Typography, Grid, Paper, Divider } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HubIcon from "@mui/icons-material/Hub";
import LockIcon from "@mui/icons-material/Lock";
import AppToolbar from "@/components/layout/AppToolbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n";

const INFO_CARDS = [
  { iconKey: "mission" as const, titleKey: "aboutMissionTitle" as const, textKey: "aboutMissionText" as const },
  { iconKey: "vision" as const, titleKey: "aboutVisionTitle" as const, textKey: "aboutVisionText" as const },
  { iconKey: "tech" as const, titleKey: "aboutTechTitle" as const, textKey: "aboutTechText" as const },
  { iconKey: "blockchain" as const, titleKey: "aboutBlockchainTitle" as const, textKey: "aboutBlockchainText" as const },
];

const ICONS = {
  mission: <VerifiedIcon sx={{ fontSize: 36, color: "primary.main" }} />,
  vision: <VisibilityIcon sx={{ fontSize: 36, color: "primary.main" }} />,
  tech: <HubIcon sx={{ fontSize: 36, color: "primary.main" }} />,
  blockchain: <LockIcon sx={{ fontSize: 36, color: "primary.main" }} />,
};

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppToolbar />

      {/* Hero */}
      <Box sx={{ bgcolor: "primary.dark", py: { xs: 6, md: 10 }, px: 3, textAlign: "center" }}>
        <Typography variant="h3" sx={{ fontWeight: 900, color: "#fff", mb: 2, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
          {t("aboutHeroTitle")}
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.75)", maxWidth: 640, mx: "auto", lineHeight: 1.7 }}>
          {t("aboutHeroSubtitle")}
        </Typography>
      </Box>

      {/* Cards */}
      <Box sx={{ flex: 1, maxWidth: 960, mx: "auto", width: "100%", px: { xs: 2, sm: 4 }, py: 6 }}>
        <Grid container spacing={3}>
          {INFO_CARDS.map(({ iconKey, titleKey, textKey }) => (
            <Grid key={titleKey} size={{ xs: 12, sm: 6 }}>
              <Paper elevation={2} sx={{ p: 3.5, height: "100%", borderTop: "3px solid", borderColor: "primary.main", display: "flex", flexDirection: "column", gap: 1.5 }}>
                {ICONS[iconKey]}
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.dark" }}>{t(titleKey)}</Typography>
                <Divider />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{t(textKey)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Blockchain diagram */}
        <Box sx={{ mt: 6, p: 3, bgcolor: "#e8f5e9", borderRadius: 2, border: "1px solid", borderColor: "primary.light" }}>
          <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, display: "block", mb: 2 }}>Supply Chain Flow</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            {["Producer", "→", "Factory", "→", "Retailer", "→", "Consumer"].map((step, i) => (
              step === "→"
                ? <Typography key={i} variant="h5" color="primary.light">→</Typography>
                : <Box key={i} sx={{ px: 2, py: 1, bgcolor: "primary.dark", color: "#fff", borderRadius: 1.5, fontWeight: 700, fontSize: "0.8rem" }}>{step}</Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
            Every step recorded on Ethereum · Immutable · Publicly verifiable
          </Typography>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}
