import { VirtualWalletProvider } from "@/lib/payment/VirtualWalletProvider";
import type { PaymentProvider } from "@/lib/payment/PaymentProvider";

// V2 will swap this for a Stripe-backed provider without touching bid logic.
export const paymentProvider: PaymentProvider = new VirtualWalletProvider();

export * from "@/lib/payment/PaymentProvider";
