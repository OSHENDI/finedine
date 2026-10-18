import { cookies } from "next/headers";
import { cartCookie, decodeCart, orderCookie } from "@/lib/cart-cookie";

// What the browser remembers for one venue: the open order and the order being followed.
export async function customerState(slug: string) {
  const store = await cookies();
  return {
    initialCart: decodeCart(store.get(cartCookie(slug))?.value),
    initialActive: store.get(orderCookie(slug))?.value ?? null
  };
}
