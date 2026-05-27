"use client";
import { useAccount } from "wagmi";
import { useUserByWallet } from "@/hooks/useUserRegistry";
import { UserRole } from "@/lib/constants";
import TransferRequestFormView from "@/components/shared/TransferRequestFormView";

export default function TransferPage() {
  const { address } = useAccount();
  const { data: userData } = useUserByWallet(address);
  const role = (userData as { role: number } | undefined)?.role as UserRole ?? UserRole.Producer;
  const recipientRole = role === UserRole.Factory
    ? UserRole.Retailer
    : role === UserRole.Retailer
      ? UserRole.Consumer
      : UserRole.Factory;
  return <TransferRequestFormView senderRole={role} recipientRole={recipientRole} />;
}
