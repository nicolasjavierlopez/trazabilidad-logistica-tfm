"use client";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");

const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const transport = http(rpcUrl);

export const wagmiConfig =
  chainId === sepolia.id
    ? createConfig({ chains: [sepolia], connectors: [injected({ shimDisconnect: true })], transports: { [sepolia.id]: transport }, ssr: true })
    : createConfig({ chains: [anvilChain], connectors: [injected({ shimDisconnect: true })], transports: { [anvilChain.id]: transport }, ssr: true });
