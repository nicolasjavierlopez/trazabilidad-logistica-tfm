"use client";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Button, Divider, Table, TableHead, TableBody, TableRow, TableCell, Chip, Tooltip, IconButton,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { Product } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/lib/i18n";
import { visibleAttrs, formatAttrKey } from "@/lib/attrUtils";

interface Props { product: Product | null; onClose: () => void; }

function truncate(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

export default function ProductDetailDialog({ product, onClose }: Props) {
  const { add, decrease, getQty } = useCart();
  const { t } = useI18n();
  if (!product) return null;

  const qty = getQty(product.tokenId);
  const features = visibleAttrs(product.features);

  const attrs = [
    { label: t("attrTokenId"), value: `#${product.tokenId}` },
    { label: t("attrSupply"), value: product.supply.toLocaleString() },
    { label: t("attrSoldBy"), value: truncate(product.retailer) },
    { label: t("attrListed"), value: new Date(Number(product.createdAt) * 1000).toLocaleDateString() },
  ];

  return (
    <Dialog open={!!product} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>{product.name}</Typography>
          <Box sx={{
            bgcolor: "rgba(46, 125, 50, 0.10)", borderRadius: "50%",
            width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <StorefrontIcon sx={{ color: "primary.main", fontSize: 28 }} />
          </Box>
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 0, pb: 2, px: 0 }}>
        {/* Image gallery row: disabled back — image — disabled forward */}
        <Box sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
          minHeight: 280,
          px: 7,
        }}>
          {/* Back button */}
          <IconButton
            disabled
            sx={{
              position: "absolute", left: 8,
              width: 48, height: 48,
              bgcolor: "rgba(0,0,0,0.06)",
              "&.Mui-disabled": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 36 }} />
          </IconButton>

          {product.imgUrl ? (
            <Box
              component="img"
              src={product.imgUrl}
              alt={product.name}
              sx={{
                maxWidth: "100%",
                maxHeight: 280,
                objectFit: "contain",
                display: "block",
                borderRadius: 1,
              }}
            />
          ) : (
            <Box sx={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 1, color: "text.disabled", py: 6,
            }}>
              <ImageNotSupportedIcon sx={{ fontSize: 56, opacity: 0.35 }} />
              <Typography variant="caption">{t("noImage")}</Typography>
            </Box>
          )}

          {/* Forward button */}
          <IconButton
            disabled
            sx={{
              position: "absolute", right: 8,
              width: 48, height: 48,
              bgcolor: "rgba(0,0,0,0.06)",
              "&.Mui-disabled": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 36 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 3, pt: 2.5 }}>
          {/* Attributes */}
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold", display: "block", mb: 1.5 }}>
            {t("attributes")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
            {attrs.map(({ label, value }) => (
              <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, flexShrink: 0 }}>{label}</Typography>
                <Tooltip title={label === t("attrSoldBy") ? product.retailer : ""} arrow placement="left">
                  <Typography variant="body2" sx={{ fontFamily: "monospace", textAlign: "right", wordBreak: "break-all" }}>{value}</Typography>
                </Tooltip>
              </Box>
            ))}
          </Box>

          {/* Characteristics */}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold", display: "block", mb: 1.5 }}>
            {t("characteristics")}
          </Typography>
          {features.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
                  <TableCell>{t("tableKey")}</TableCell>
                  <TableCell>{t("tableValue")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {features.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell sx={{ fontWeight: 500 }}>{formatAttrKey(k)}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">{t("noCharacteristics")}</Typography>
          )}
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1.5, justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose}>{t("close")}</Button>

        {qty === 0 ? (
          <Button
            variant="contained"
            startIcon={<AddShoppingCartIcon />}
            onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })}
          >
            {t("addToCart")}
          </Button>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<RemoveIcon sx={{ fontSize: 16 }} />}
              label=""
              clickable
              onClick={() => decrease(product.tokenId)}
              sx={{ "& .MuiChip-label": { px: 0 }, width: 36, bgcolor: "grey.100" }}
            />
            <Typography sx={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{qty}</Typography>
            <Chip
              icon={<AddIcon sx={{ fontSize: 16 }} />}
              label=""
              clickable
              color="primary"
              onClick={() => add({ tokenId: product.tokenId, name: product.name, imgUrl: product.imgUrl })}
              sx={{ "& .MuiChip-label": { px: 0 }, width: 36 }}
            />
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
