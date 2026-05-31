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

export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.None]: "#9e9e9e",
  [UserRole.Admin]: "#795548",
  [UserRole.Producer]: "#2e7d32",
  [UserRole.Factory]: "#1565c0",
  [UserRole.Retailer]: "#e65100",
  [UserRole.Consumer]: "#6a1b9a",
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
  [UserRole.None]: "/", [UserRole.Admin]: "/admin",
  [UserRole.Producer]: "/dashboard", [UserRole.Factory]: "/dashboard",
  [UserRole.Retailer]: "/dashboard", [UserRole.Consumer]: "/dashboard",
};

export const REGISTERABLE_ROLES = [UserRole.Producer, UserRole.Factory, UserRole.Retailer, UserRole.Consumer] as const;
export const USER_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
export const RAW_MATERIAL_ADDRESS = (process.env.NEXT_PUBLIC_RAW_MATERIAL_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Address;
