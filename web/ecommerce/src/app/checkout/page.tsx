"use client";
import { useState, useMemo } from "react";
import {
  Box, Typography, Button, Paper, Stepper, Step, StepLabel,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AppToolbar from "@/components/layout/AppToolbar";
import PurchaseDetailsStep from "@/components/checkout/PurchaseDetailsStep";
import AddressStep, { type AddressData } from "@/components/checkout/AddressStep";
import PaymentStep from "@/components/checkout/PaymentStep";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

const STEPS = ["Purchase details", "Shipping address", "Payment"];

function generateOrderNumber() {
  return `FP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const EMPTY_ADDRESS: AddressData = { name: "", street: "", city: "", postalCode: "", country: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [confirmed, setConfirmed] = useState(false);

  const orderNumber = useMemo(() => generateOrderNumber(), []);
  const orderDate = useMemo(() => formatDate(new Date()), []);

  // Snapshot items at confirmation time so they persist in the invoice after cart is cleared
  const [frozenItems, setFrozenItems] = useState(items);

  const invoiceData = {
    orderNumber,
    date: orderDate,
    items: frozenItems,
    address,
  };

  const addressValid = address.name.trim() && address.street.trim() && address.city.trim() && address.postalCode.trim() && address.country.trim();

  const canNext =
    step === 0 ? items.length > 0 :
    step === 1 ? !!addressValid :
    false;

  const handleComplete = () => {
    setFrozenItems(items); // snapshot before clearing
    setConfirmed(true);
    clear();
  };

  const isPaymentStep = step === STEPS.length - 1;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppToolbar />
      <Box sx={{ flex: 1, px: { xs: 2, sm: 4 }, py: 4, maxWidth: 860, mx: "auto", width: "100%" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/")} sx={{ mb: 3 }}>
          Back to store
        </Button>

        <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.dark", mb: 3 }}>Checkout</Typography>

        {/* Stepper */}
        <Stepper activeStep={confirmed ? STEPS.length : step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
          {step === 0 && <PurchaseDetailsStep items={items} />}
          {step === 1 && <AddressStep data={address} onChange={setAddress} />}
          {step === 2 && <PaymentStep invoiceData={invoiceData} onComplete={handleComplete} />}
        </Paper>

        {/* Navigation */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => confirmed ? router.push("/") : setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 && !confirmed}
          >
            {confirmed ? "Back to store" : "Back"}
          </Button>

          {!isPaymentStep && !confirmed && (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              Continue
            </Button>
          )}

          {confirmed && (
            <Button variant="contained" onClick={() => router.push("/")}>
              Back to store
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
