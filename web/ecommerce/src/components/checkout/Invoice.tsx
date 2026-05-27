"use client";
import { forwardRef } from "react";
import { Box, Typography, Divider, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import type { CartItem } from "@/context/CartContext";

interface InvoiceData {
  orderNumber: string;
  date: string;
  items: CartItem[];
  address: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

interface Props { data: InvoiceData; }

// Forwarded ref so parent can call window.print() targeting this node
const Invoice = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        p: 4,
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Pure CSS logo — renders cleanly in print without MUI SVG */}
          <Box sx={{
            width: 36, height: 36, borderRadius: "8px",
            bgcolor: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1rem", lineHeight: 1, fontFamily: "monospace" }}>Fp</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#1b5e20", lineHeight: 1.1 }}>
              Farma<span style={{ color: "#4caf50" }}>Plus</span>
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "#666", display: "block" }}>Certified Supply Chain</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#1b5e20", letterSpacing: 1 }}>INVOICE</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: "#555", mt: 0.25 }}>#{data.orderNumber}</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: "#555" }}>{data.date}</Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Bill to */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: "bold" }}>Bill to</Typography>
        <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{data.address.name}</Typography>
        <Typography variant="body2" color="text.secondary">{data.address.street}</Typography>
        <Typography variant="body2" color="text.secondary">
          {data.address.city}, {data.address.postalCode}
        </Typography>
        <Typography variant="body2" color="text.secondary">{data.address.country}</Typography>
      </Box>

      {/* Items table */}
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#e8f5e9" }}>
            <TableCell sx={{ fontWeight: "bold", color: "#1b5e20" }}>Product</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold", color: "#1b5e20" }}>Token ID</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold", color: "#1b5e20" }}>Qty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.tokenId} sx={{ "&:last-child td": { borderBottom: 0 } }}>
              <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
              <TableCell align="center" sx={{ fontFamily: "monospace", color: "text.secondary", fontSize: "0.78rem" }}>
                #{item.tokenId}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Divider sx={{ mb: 2 }} />

      {/* Total */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body2" color="text.secondary">
            Total items: <strong>{data.items.reduce((s, i) => s + i.qty, 0)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total products: <strong>{data.items.length}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Divider sx={{ mt: 3, mb: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.disabled">
          This invoice is generated automatically by FarmaPlus supply chain system.
        </Typography>
        <Typography variant="caption" color="text.disabled">farmaplus.io</Typography>
      </Box>
    </Box>
  );
});

Invoice.displayName = "Invoice";
export default Invoice;
export type { InvoiceData };
