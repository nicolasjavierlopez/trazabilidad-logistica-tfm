"use client";
import {
  Drawer, Box, Typography, IconButton, Divider, Button,
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

interface Props { open: boolean; onClose: () => void; }

export default function CartDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const { items, add, decrease, remove, clear, totalQty } = useCart();

  const handleCheckout = () => {
    onClose();
    router.push("/checkout");
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 380 } } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>Cart</Typography>
          {totalQty > 0 && (
            <Box sx={{ bgcolor: "primary.main", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
              {totalQty}
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      {items.length === 0 ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: "text.secondary", p: 4 }}>
          <ShoppingCartIcon sx={{ fontSize: 56, opacity: 0.3 }} />
          <Typography>Your cart is empty</Typography>
        </Box>
      ) : (
        <>
          <List sx={{ flex: 1, overflowY: "auto" }}>
            {items.map((item) => (
              <ListItem
                key={item.tokenId}
                sx={{ gap: 1, alignItems: "center" }}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => remove(item.tokenId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar src={item.imgUrl} variant="rounded" sx={{ bgcolor: "grey.100", width: 48, height: 48 }}>
                    {!item.imgUrl && <ImageNotSupportedIcon sx={{ color: "grey.400" }} />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>}
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      <IconButton size="small" sx={{ p: 0.25, border: "1px solid", borderColor: "grey.300" }} onClick={() => decrease(item.tokenId)}>
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</Typography>
                      <IconButton size="small" sx={{ p: 0.25, border: "1px solid", borderColor: "grey.300" }} onClick={() => add({ tokenId: item.tokenId, name: item.name, imgUrl: item.imgUrl })}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button variant="contained" fullWidth size="large" onClick={handleCheckout}>
              Checkout ({totalQty} item{totalQty !== 1 ? "s" : ""})
            </Button>
            <Button variant="text" color="inherit" fullWidth onClick={clear} size="small">Clear cart</Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
