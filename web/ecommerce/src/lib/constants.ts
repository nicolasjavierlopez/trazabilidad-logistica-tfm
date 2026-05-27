import type { Address } from "viem";

export enum UserRole { None = 0, Admin = 1, Producer = 2, Factory = 3, Retailer = 4, Consumer = 5 }
export enum UserStatus { None = 0, Pending = 1, Approved = 2, Rejected = 3 }

export const USER_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
export const RAW_MATERIAL_ADDRESS = (process.env.NEXT_PUBLIC_RAW_MATERIAL_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Address;
