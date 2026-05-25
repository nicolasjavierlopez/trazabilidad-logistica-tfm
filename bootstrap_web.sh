#!/bin/bash
set -e
ROOT="/Users/nlopez/logistics-pfm/web/src"
mkdir -p "$ROOT/lib" "$ROOT/hooks" "$ROOT/components/providers" "$ROOT/components/layout" "$ROOT/components/auth" "$ROOT/app/admin/users/[id]" "$ROOT/app/dashboard/producer"

cat > "$ROOT/lib/constants.ts" << 'EOF'
import type { Address } from "viem";

export const ANVIL_ACCOUNTS: readonly Address[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf542677C0847ac884F6794f055dACb239",
] as const;

export enum UserRole { None = 0, Admin = 1, Producer = 2, Factory = 3, Retailer = 4, Consumer = 5 }
export enum UserStatus { None = 0, Pending = 1, Approved = 2, Rejected = 3 }

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.None]: "None", [UserRole.Admin]: "Admin", [UserRole.Producer]: "Producer",
  [UserRole.Factory]: "Factory", [UserRole.Retailer]: "Retailer", [UserRole.Consumer]: "Consumer",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.None]: "None", [UserStatus.Pending]: "Pending",
  [UserStatus.Approved]: "Approved", [UserStatus.Rejected]: "Rejected",
};

export const ANVIL_ROLE_MAP: Record<string, UserRole> = {
  [ANVIL_ACCOUNTS[0].toLowerCase()]: UserRole.Admin,
  [ANVIL_ACCOUNTS[1].toLowerCase()]: UserRole.Producer,
  [ANVIL_ACCOUNTS[2].toLowerCase()]: UserRole.Factory,
  [ANVIL_ACCOUNTS[3].toLowerCase()]: UserRole.Retailer,
  [ANVIL_ACCOUNTS[4].toLowerCase()]: UserRole.Consumer,
};

export const ROLE_ROUTES: Record<UserRole, string> = {
  [UserRole.None]: "/login", [UserRole.Admin]: "/admin",
  [UserRole.Producer]: "/dashboard/producer", [UserRole.Factory]: "/dashboard/factory",
  [UserRole.Retailer]: "/dashboard/retailer", [UserRole.Consumer]: "/dashboard/consumer",
};

export const REGISTERABLE_ROLES = [UserRole.Producer, UserRole.Factory, UserRole.Retailer, UserRole.Consumer] as const;
export const USER_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
EOF

cat > "$ROOT/lib/wagmi.ts" << 'EOF'
"use client";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"] } },
});

export const wagmiConfig = createConfig({
  chains: [anvilChain],
  connectors: [injected({ target: "metaMask" })],
  transports: { [anvilChain.id]: http() },
  ssr: true,
});
EOF

echo "bootstrap part1 done"
