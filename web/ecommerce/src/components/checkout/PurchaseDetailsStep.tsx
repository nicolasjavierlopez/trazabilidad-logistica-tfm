"use client";
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Avatar, Chip,
} from "@mui/material";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import type { CartItem } from "@/context/CartContext";

interface Props { items: CartItem[]; }

export default function PurchaseDetailsStep({ items }: Props) {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
        <ShoppingCartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
        <Typography>No items in cart.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Review the items in your order before continuing.
      </Typography>
      <Table>
        <TableHead>
          <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "grey.50" } }}>
            <TableCell>Product</TableCell>
            <TableCell align="center">Token ID</TableCell>
            <TableCell align="right">Qty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.tokenId} hover>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar src={item.imgUrl} variant="rounded" sx={{ width: 40, height: 40, bgcolor: "grey.100" }}>
                    {!item.imgUrl && <ImageNotSupportedIcon sx={{ fontSize: 20, color: "grey.400" }} />}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Chip label={`#${item.tokenId}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: 700 }}>{item.qty}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}>
        <Typography variant="body2" color="text.secondary">Total items: <strong>{totalQty}</strong></Typography>
        <Typography variant="body2" color="text.secondary">Products: <strong>{items.length}</strong></Typography>
      </Box>
    </Box>
  );
}
