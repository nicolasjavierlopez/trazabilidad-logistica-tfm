"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Box, Typography, CircularProgress, Alert, Grid } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AppToolbar from "@/components/layout/AppToolbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/products/ProductCard";
import ProductListItem from "@/components/products/ProductListItem";
import ProductToolbar, { type ViewMode } from "@/components/products/ProductToolbar";
import { useProducts } from "@/hooks/useProducts";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 20;

export default function HomePage() {
  const { products, isLoading } = useProducts();
  const { t } = useI18n();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter by search term
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      Object.entries(p.features).some(([, v]) => String(v).toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  // Reset pagination when filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filtered.length]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Infinite scroll
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((n) => n + PAGE_SIZE); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleProducts.length]);

  const countLabel = searchTerm
    ? t("filterResults", { count: String(filtered.length), plural: filtered.length !== 1 ? "s" : "", term: searchTerm })
    : t("productsAvailable", { count: String(products.length), plural: products.length !== 1 ? "s" : "" });

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppToolbar />

      <Box id="products" sx={{ flex: 1, px: { xs: 2, sm: 4 }, py: 4, maxWidth: 1280, mx: "auto", width: "100%" }}>
        {/* Hero */}
        <Box sx={{ mb: 5, textAlign: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 1 }}>
            <StorefrontIcon sx={{ fontSize: 36, color: "primary.main" }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.dark" }}>
              Farma<span style={{ color: "#4caf50" }}>Plus</span>
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">{t("storeSubtitle")}</Typography>
        </Box>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress color="primary" />
          </Box>
        )}

        {!isLoading && (
          <>
            {/* Product toolbar: search + view toggle */}
            <ProductToolbar
              onSearch={setSearchTerm}
              viewMode={viewMode}
              onViewChange={setViewMode}
            />

            {/* Count / filter label */}
            {products.length > 0 && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {countLabel}
              </Typography>
            )}

            {/* Empty states */}
            {products.length === 0 && (
              <Alert severity="info" icon={<StorefrontIcon />} sx={{ maxWidth: 500, mx: "auto" }}>
                {t("noProducts")}
              </Alert>
            )}

            {products.length > 0 && filtered.length === 0 && (
              <Alert severity="warning" sx={{ maxWidth: 500, mx: "auto" }}>
                {t("noResults")}
              </Alert>
            )}

            {/* Grid view */}
            {viewMode === "grid" && visibleProducts.length > 0 && (
              <Grid container spacing={3}>
                {visibleProducts.map((product) => (
                  <Grid key={product.tokenId} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ProductCard product={product} />
                  </Grid>
                ))}
              </Grid>
            )}

            {/* List view */}
            {viewMode === "list" && visibleProducts.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {visibleProducts.map((product) => (
                  <ProductListItem key={product.tokenId} product={product} />
                ))}
              </Box>
            )}

            {/* Sentinel for infinite scroll */}
            {filtered.length > 0 && (
              <Box ref={sentinelRef} sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                {hasMore
                  ? <CircularProgress size={28} color="primary" />
                  : <Typography variant="caption" color="text.disabled">{t("allLoaded")}</Typography>
                }
              </Box>
            )}
          </>
        )}
      </Box>

      <Footer />
    </Box>
  );
}
