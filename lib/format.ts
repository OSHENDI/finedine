export function formatMoney(cents: number, currency = "ILS") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(cents / 100);
}

export function sanitizeSearch(value: string) {
  return value.trim().toLowerCase();
}
