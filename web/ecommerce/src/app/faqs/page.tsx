"use client";
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlined";
import AppToolbar from "@/components/layout/AppToolbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n";

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function FaqsPage() {
  const { t } = useI18n();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppToolbar />

      {/* Hero */}
      <Box sx={{ bgcolor: "primary.dark", py: { xs: 5, md: 8 }, px: 3, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <HelpOutlineIcon sx={{ fontSize: 44, color: "primary.light" }} />
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 900, color: "#fff", mb: 1.5, fontSize: { xs: "1.8rem", md: "2.2rem" } }}>
          {t("faqsHeroTitle")}
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", maxWidth: 540, mx: "auto" }}>
          {t("faqsHeroSubtitle")}
        </Typography>
      </Box>

      {/* Accordion list */}
      <Box sx={{ flex: 1, maxWidth: 760, mx: "auto", width: "100%", px: { xs: 2, sm: 4 }, py: 5 }}>
        {FAQ_KEYS.map((n) => (
          <Accordion
            key={n}
            elevation={1}
            sx={{
              mb: 1.5, borderRadius: "10px !important", overflow: "hidden",
              "&:before": { display: "none" },
              border: "1px solid", borderColor: "grey.200",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon color="primary" />}
              sx={{ "&.Mui-expanded": { bgcolor: "#e8f5e9" }, fontWeight: 600 }}
            >
              <Typography sx={{ fontWeight: 600 }}>{t(`faq${n}Q` as Parameters<typeof t>[0])}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: "#f9fbe7" }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {t(`faq${n}A` as Parameters<typeof t>[0])}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <Footer />
    </Box>
  );
}
