"use client";
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import RawMaterialAbi from "@/abi/RawMaterial.json";
import { RAW_MATERIAL_ADDRESS } from "@/lib/constants";
import type { Address, Abi } from "viem";

const ABI = RawMaterialAbi as Abi;

export function useTokensByOwner(owner?: Address) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getTokensByOwner",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });
}

export function useToken(tokenId?: bigint) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getToken",
    args: tokenId && tokenId > 0n ? [tokenId] : undefined,
    query: { enabled: !!tokenId && tokenId > 0n },
  });
}

export function useTokensBatch(tokenIds: bigint[]) {
  const contracts = tokenIds.map((id) => ({
    address: RAW_MATERIAL_ADDRESS as Address,
    abi: ABI,
    functionName: "getToken" as const,
    args: [id] as [bigint],
  }));
  return useReadContracts({ contracts, query: { enabled: contracts.length > 0 } });
}

export function useTransfersBySender(sender?: Address) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getTransfersBySender",
    args: sender ? [sender] : undefined,
    query: { enabled: !!sender },
  });
}

export function useTransfersByRecipient(recipient?: Address) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getTransfersByRecipient",
    args: recipient ? [recipient] : undefined,
    query: { enabled: !!recipient },
  });
}

export function useReceivedBalancesBatch(tokenIds: bigint[], holder?: Address) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getReceivedBalancesBatch",
    args: tokenIds.length > 0 && holder ? [tokenIds, holder] : undefined,
    query: { enabled: tokenIds.length > 0 && !!holder },
  });
}

export function useReceivedBalance(tokenId?: bigint, holder?: Address) {
  return useReadContract({
    address: RAW_MATERIAL_ADDRESS,
    abi: RawMaterialAbi,
    functionName: "getReceivedBalance",
    args: tokenId && holder ? [tokenId, holder] : undefined,
    query: { enabled: !!tokenId && !!holder },
  });
}

export function useRawMaterialWrite() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  return { writeContract, hash, isPending, isConfirming, isSuccess, error, reset };
}
