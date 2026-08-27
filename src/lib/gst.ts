/** GST maths and Indian invoice helpers. */

export type GstLine = {
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  sac_code: string;
};

export type ComputedLine = GstLine & {
  amount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type GstTotals = {
  lines: ComputedLine[];
  subtotal: number;
  discount: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  round_off: number;
  total: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits a proportional discount across lines and applies CGST+SGST (intra-state)
 * or IGST (inter-state) per line, then rounds the invoice to the nearest rupee.
 */
export function computeGstTotals(
  input: GstLine[],
  discount: number,
  interState: boolean,
): GstTotals {
  const lines = input.filter((l) => l.description);
  const subtotal = r2(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const disc = Math.min(Math.max(discount, 0), subtotal);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let taxable = 0;

  const computed: ComputedLine[] = lines.map((l) => {
    const amount = r2(l.quantity * l.unit_price);
    const share = subtotal > 0 ? amount / subtotal : 0;
    const taxable_amount = r2(amount - disc * share);
    const rate = Number(l.gst_rate) || 0;
    const lineIgst = interState ? r2((taxable_amount * rate) / 100) : 0;
    const half = interState ? 0 : r2((taxable_amount * rate) / 200);
    taxable += taxable_amount;
    cgst += half;
    sgst += half;
    igst += lineIgst;
    return { ...l, amount, taxable_amount, cgst: half, sgst: half, igst: lineIgst };
  });

  taxable = r2(taxable);
  cgst = r2(cgst);
  sgst = r2(sgst);
  igst = r2(igst);
  const tax = r2(cgst + sgst + igst);
  const gross = r2(taxable + tax);
  const total = Math.round(gross);
  return {
    lines: computed,
    subtotal,
    discount: r2(disc),
    taxable_value: taxable,
    cgst,
    sgst,
    igst,
    tax,
    round_off: r2(total - gross),
    total,
  };
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = TENS[Math.floor(n / 10)] ?? "";
  const o = ONES[n % 10] ?? "";
  return o ? `${t} ${o}` : t;
}

function inWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  if (crore) parts.push(`${inWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** "₹1,180" → "Rupees One Thousand One Hundred Eighty Only". */
export function amountInWords(value: number | string) {
  const n = Math.round(Number(value ?? 0));
  return `Rupees ${inWords(Math.abs(n))} Only`;
}

export const INDIAN_STATES: { name: string; code: string }[] = [
  { name: "Andhra Pradesh", code: "37" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chandigarh", code: "04" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Delhi", code: "07" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jammu & Kashmir", code: "01" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Odisha", code: "21" },
  { name: "Puducherry", code: "34" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
];

export const stateCode = (name: string | null | undefined) =>
  INDIAN_STATES.find((s) => s.name === name)?.code ?? null;

/** Validates the 15-character GSTIN format. */
export function isValidGstin(value: string) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.toUpperCase());
}
