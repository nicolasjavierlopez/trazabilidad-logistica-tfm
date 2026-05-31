"use client";
import { useReadContract, useReadContracts } from "wagmi";
import UserRegistryAbi from "@/abi/UserRegistry.json";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { USER_REGISTRY_ADDRESS, RAW_MATERIAL_ADDRESS, UserRole, UserStatus } from "@/lib/constants";
import type { Address, Abi } from "viem";

const RAW_ABI = RawMaterialAbi as Abi;

function sanitizeUrl(url: string): string {
  const second = url.indexOf("https://", 8);
  return second !== -1 ? url.slice(0, second) : url;
}

interface UserRow { wallet: Address; role: number; status: number; registeredAt: bigint; txCount: bigint; }

export interface Product {
  tokenId: string;
  name: string;
  supply: bigint;
  imgUrl?: string;
  features: Record<string, unknown>;
  retailer: Address;
  createdAt: bigint;
}

export function useProducts() {
  const { data: allUsersData, isLoading: usersLoading } = useReadContract({
    address: USER_REGISTRY_ADDRESS,
    abi: UserRegistryAbi,
    functionName: "getAllUsers",
  });

  const retailers: Address[] = ((allUsersData as UserRow[] | undefined) ?? [])
    .filter((u) => u.role === UserRole.Retailer && u.status === UserStatus.Approved)
    .map((u) => u.wallet);

  const tokenCalls = retailers.map((addr) => ({
    address: RAW_MATERIAL_ADDRESS as Address,
    abi: RAW_ABI,
    functionName: "getTokensByOwner" as const,
    args: [addr] as [Address],
  }));

  const { data: batchData, isLoading: tokensLoading } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: retailers.length > 0 },
  });

  const products: Product[] = [];

  (batchData ?? []).forEach((result, i) => {
    if (result.status !== "success") return;
    const retailer = retailers[i];
    const tokens = result.result as Array<{
      id: bigint; name: string; supply: bigint; balance: bigint;
      features: string; parentId: bigint; creator: Address; createdAt: bigint;
    }>;

    tokens.forEach((tok) => {
      let features: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(tok.features);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) features = parsed;
      } catch { /* not JSON */ }

      products.push({
        tokenId: tok.id.toString(),
        name: tok.name,
        supply: tok.supply,
        imgUrl: typeof features.imgUrl === "string"
          ? sanitizeUrl(features.imgUrl)
          : typeof features.urlImg === "string"
            ? sanitizeUrl(features.urlImg)
            : undefined,
        features,
        retailer,
        createdAt: tok.createdAt,
      });
    });
  });

  return { products, isLoading: usersLoading || tokensLoading };
}
