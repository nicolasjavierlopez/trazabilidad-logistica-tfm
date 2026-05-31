"use client";
import { useState } from "react";
import {
  Card, CardContent, CardMedia, CardActions, Box, Typography,
  Button, Chip, Tooltip, IconButton, Skeleton,
} from "@mui/material";
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

export default function ProductCard({ product }: Props) {
  const { add, decrease, getQty } = useCart();
  const { t } = useI18n();
  const [detailOpen, setDetailOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const qty = getQty(product.tokenId);

  const extraAttrs = visibleAttrs(product.features);

  return (
    <>
      <Card elevation={2} sx={{ display: "flex", flexDirection: "column", height: "100%", "&:hover": { boxShadow: 6 }, transition: "box-shadow 0.2s" }}>
        {product.imgUrl ? (
          <Box sx={{ p: "20px", pb: 0 }} onClick={() => setDetailOpen(true)}>
            {!imgLoaded && (
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 1 }} animation="wave" />
            )}
            <CardMedia
              component="img"
              height="180"
              image={product.imgUrl}
              alt={product.name}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
              sx={{ objectFit: "cover", cursor: "pointer", borderRadius: 1, display: imgLoaded ? "block" : "none" }}
            />
          </Box>
        ) : (
          <Box
            onClick={() => setDetailOpen(true)}
            sx={{
              height: 180, bgcolor: "grey.100", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 1, color: "text.disabled",
              cursor: "pointer",
            }}
          >
            <ImageNotSupportedIcon sx={{ fontSize: 52, opacity: 0.4 }} />
            <Typography variant="caption">{t("noImage")}</Typography>
          </Box>
        )}

        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.3 }}>{product.name}</Typography>

          <Chip
            label={`${t("attrSupply")}: ${product.supply.toLocaleString()}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />

          {extraAttrs.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {extraAttrs.slice(0, 3).map(([k, v]) => (
                <Chip
                  key={k}
                  label={`${formatAttrKey(k)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.68rem", height: 22, color: "text.secondary", borderColor: "grey.300" }}
                />
              ))}
            </Box>
          )}

          <Tooltip title={product.retailer} arrow placement="bottom">
            <Typography variant="caption" color="text.disabled" sx={{ mt: "auto", fontFamily: "monospace" }}>
              {t("soldBy")} {truncate(product.retailer)}
            </Typography>
          </Tooltip>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 1, gap: 1 }}>
          <Tooltip title={t("details")} arrow>
            <IconButton size="small" onClick={() => setDetailOpen(true)} sx={{ color: "text.secondary", border: "1px solid", borderColor: "grey.300" }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {qty === 0 ? (
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddShoppingCartIcon />}
              onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })}
            >
              {t("addToCart")}
            </Button>
          ) : (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, border: "1px solid", borderColor: "primary.main", borderRadius: 1.5, py: 0.5 }}>
              <IconButton size="small" onClick={() => decrease(product.tokenId)} sx={{ color: "primary.main" }}>
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontWeight: 700, minWidth: 28, textAlign: "center", color: "primary.dark" }}>{qty}</Typography>
              <IconButton size="small" onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })} sx={{ color: "primary.main" }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </CardActions>

        <Box sx={{ pb: 1.5, textAlign: "center" }}>
          <Typography
            component="span"
            variant="caption"
            onClick={() => setTraceOpen(true)}
            sx={{
              color: "text.disabled",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.7rem",
              "&:hover": { color: "primary.main" },
            }}
          >
            {t("viewTraceability")}
          </Typography>
        </Box>
      </Card>

      <ProductDetailDialog product={detailOpen ? product : null} onClose={() => setDetailOpen(false)} />
      <TraceabilityDialog tokenId={traceOpen ? BigInt(product.tokenId) : null} onClose={() => setTraceOpen(false)} />
    </>
  );
}
