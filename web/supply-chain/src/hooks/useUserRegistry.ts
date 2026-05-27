"use client";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import UserRegistryAbi from "@/abi/UserRegistry.json";
import { USER_REGISTRY_ADDRESS } from "@/lib/constants";
import type { Address } from "viem";

export function useUserByWallet(wallet?: Address) {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "getUserByWallet", args: wallet ? [wallet] : undefined, query: { enabled: !!wallet, retry: false } });
}
export function useUser(userId: bigint) {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "getUser", args: [userId], query: { enabled: userId > BigInt(0) } });
}
export function useIsRegistered(wallet?: Address) {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "isRegistered", args: wallet ? [wallet] : undefined, query: { enabled: !!wallet } });
}
export function useAllUsers() {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "getAllUsers" });
}
export function useUserCount() {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "getUserCount" });
}
export function useUserTransactions(userId: bigint) {
  return useReadContract({ address: USER_REGISTRY_ADDRESS, abi: UserRegistryAbi, functionName: "getUserTransactions", args: [userId], query: { enabled: userId > BigInt(0) } });
}
export function useRegistryWrite() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  return { writeContract, hash, isPending, isConfirming, isSuccess, error, reset };
}
