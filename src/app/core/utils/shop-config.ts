//Direct Checkout path shop IDs
export const DIRECT_CHECKOUT_SHOP_IDS: string[] = [
  '68b19909755e111c27e5557d', // miranusa
];

// Check if a shop ID should have direct checkout behavior
export function shouldUseDirectCheckout(shopId: string): boolean {
  return DIRECT_CHECKOUT_SHOP_IDS.includes(shopId);
}

