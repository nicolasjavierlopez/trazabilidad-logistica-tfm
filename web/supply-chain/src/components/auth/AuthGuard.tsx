"use client";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { useIsRegistered, useUserByWallet } from "@/hooks/useUserRegistry";
import { ROLE_ROUTES, UserRole, UserStatus } from "@/lib/constants";
import { CircularProgress, Box } from "@mui/material";

const PUBLIC = ["/"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const { data: isRegistered, isLoading: regLoading } = useIsRegistered(address);
  const { data: user, isLoading: userLoading } = useUserByWallet(address);

  useEffect(() => {
    if (isConnecting) return;
    if (!isConnected && !PUBLIC.includes(pathname)) { router.replace("/"); return; }
    if (!isConnected || regLoading || userLoading || PUBLIC.includes(pathname)) return;
    if (!isRegistered) return;
    const u = user as { role: number; status: number } | undefined;
    if (!u) return;
    if (u.status !== UserStatus.Approved) { router.replace("/"); return; }
    const role = u.role as UserRole;
    if (role === UserRole.Admin) { if (!pathname.startsWith("/admin")) router.replace("/admin"); return; }
    if (pathname === "/") router.replace("/dashboard");
  }, [isConnected, isConnecting, address, pathname, router, isRegistered, regLoading, userLoading, user]);

  if (isConnecting || (isConnected && (regLoading || userLoading))) {
    return <Box className="flex min-h-screen items-center justify-center"><CircularProgress /></Box>;
  }
  return <>{children}</>;
}
