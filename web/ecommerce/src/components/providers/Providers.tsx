"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { wagmiConfig } from "@/lib/wagmi";
import { theme } from "@/lib/theme";
import { CartProvider } from "@/context/CartContext";
import { I18nProvider } from "@/lib/i18n";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <I18nProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <CartProvider>
              {children}
            </CartProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </I18nProvider>
  );
}
