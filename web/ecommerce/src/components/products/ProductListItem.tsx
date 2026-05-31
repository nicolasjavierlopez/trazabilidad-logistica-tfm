"use client";
import { useState } from "react";
import { Box, Typography, Paper, Chip, Tooltip, IconButton, Skeleton } from "@mui/material";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { Product } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/lib/i18n";
import { visibleAttrs, formatAttrKey } from "@/lib/attrUtils";
import ProductDetailDialog from "./ProductDetailDialog";
import TraceabilityDialog from "./TraceabilityDialog";

interface Props { product: Product; }

function truncate(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

export default function ProductListItem({ product }: Props) {
  const { add, decrease, getQty } = useCart();
  const { t } = useI18n();
  const [detailOpen, setDetailOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const qty = getQty(product.tokenId);
  const extraAttrs = visibleAttrs(product.features).slice(0, 4);

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          display: "flex", alignItems: "center", gap: 2, p: 1.5,
          borderRadius: 2, border: "1px solid", borderColor: "grey.100",
          "&:hover": { boxShadow: 4, borderColor: "primary.light" },
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        {/* Thumbnail */}
        <Box
          onClick={() => setDetailOpen(true)}
          sx={{
            width: 88, height: 88, flexShrink: 0, borderRadius: 1.5, overflow: "hidden",
            bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {product.imgUrl ? (
            <>
              {!imgLoaded && (
                <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
              )}
              <Box
                component="img"
                src={product.imgUrl}
                alt={product.name}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: imgLoaded ? "block" : "none" }}
              />
            </>
          ) : (
            <ImageNotSupportedIcon sx={{ fontSize: 32, color: "grey.400" }} />
          )}
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {product.name}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            <Chip
              label={`${t("attrSupply")}: ${product.supply.toLocaleString()}`}
              size="small" color="primary" variant="outlined"
              sx={{ height: 20, fontSize: "0.68rem" }}
            />
            {extraAttrs.map(([k, v]) => (
              <Chip
                key={k}
                label={`${formatAttrKey(k)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`}
                size="small" variant="outlined"
                sx={{ height: 20, fontSize: "0.68rem", color: "text.secondary", borderColor: "grey.300" }}
              />
            ))}
          </Box>

          <Tooltip title={product.retailer} arrow placement="bottom-start">
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
              {t("soldBy")} {truncate(product.retailer)}
            </Typography>
          </Tooltip>

          <Typography
            component="span"
            variant="caption"
            onClick={() => setTraceOpen(true)}
            sx={{
              color: "text.disabled",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.68rem",
              alignSelf: "flex-start",
              "&:hover": { color: "primary.main" },
            }}
          >
            {t("viewTraceability")}
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Tooltip title={t("details")} arrow>
            <IconButton size="small" onClick={() => setDetailOpen(true)} sx={{ color: "text.secondary", border: "1px solid", borderColor: "grey.300" }}>
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {qty === 0 ? (
            <Tooltip title={t("addToCart")} arrow>
              <IconButton
                size="small"
                onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })}
                sx={{ bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" }, borderRadius: 1.5 }}
              >
                <AddShoppingCartIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "primary.main", borderRadius: 1.5, px: 0.5, py: 0.25 }}>
              <IconButton size="small" onClick={() => decrease(product.tokenId)} sx={{ color: "primary.main", p: 0.25 }}>
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: "center", fontSize: "0.85rem", color: "primary.dark" }}>{qty}</Typography>
              <IconButton size="small" onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })} sx={{ color: "primary.main", p: 0.25 }}>
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}
        </Box>
      </Paper>

      <ProductDetailDialog product={detailOpen ? product : null} onClose={() => setDetailOpen(false)} />
      <TraceabilityDialog tokenId={traceOpen ? BigInt(product.tokenId) : null} onClose={() => setTraceOpen(false)} />
    </>
  );
}
