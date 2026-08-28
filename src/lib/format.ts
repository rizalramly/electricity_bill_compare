const rmFormatter = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `RM 1,234.56`; negative amounts as `−RM 12.34`. */
export function formatRM(amount: number): string {
  const abs = rmFormatter.format(Math.abs(amount));
  return amount < 0 ? `−RM ${abs}` : `RM ${abs}`;
}

/** AFA / ICPT rates with an explicit sign: `+3.80` / `−1.10`. */
export function formatSigned(value: number, decimals = 2): string {
  const abs = Math.abs(value).toFixed(decimals);
  return value < 0 ? `−${abs}` : `+${abs}`;
}

export function formatKwh(value: number): string {
  return `${new Intl.NumberFormat("en-MY").format(value)} kWh`;
}

export function formatPercent(value: number): string {
  const abs = Math.abs(value).toFixed(1);
  return value < 0 ? `−${abs}%` : `+${abs}%`;
}
