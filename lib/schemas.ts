import { z } from "zod";

export const paymentSchema = z.object({
  label: z.string().trim().min(1).max(80),
  labelAr: z.string().trim().max(80).optional(),
  type: z.enum(["cash_or_card", "digital_wallet", "bank", "other"]),
  accountName: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  details: z.string().trim().max(300),
  detailsAr: z.string().trim().max(300).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
});

// Only images this app serves itself, or the demo photo host the CSP and next/image allow.
const imageUrl = z
  .string()
  .max(300)
  .refine((value) => value === "" || value.startsWith("/api/media/") || value.startsWith("https://images.unsplash.com/"), "Unsupported image address");

export const itemSchema = z.object({
  categoryId: z.string().uuid(),
  nameEn: z.string().trim().min(1).max(24),
  nameAr: z.string().trim().max(24),
  description: z.string().trim().max(400),
  descriptionAr: z.string().trim().max(400).optional(),
  imageUrl,
  priceCents: z.number().int().min(1).max(1_000_000),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  labels: z.string().trim().max(120).optional(),
  variants: z.array(z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), nameAr: z.string().trim().max(80).optional(), priceDelta: z.number().int().min(-1_000_000).max(1_000_000) })).max(12),
  addOns: z.array(z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), nameAr: z.string().trim().max(80).optional(), priceCents: z.number().int().min(0).max(1_000_000) })).max(30)
});

export const categorySchema = z.object({
  nameEn: z.string().trim().min(1).max(80),
  nameAr: z.string().trim().max(80),
  isActive: z.boolean().optional()
});

// bcrypt only reads the first 72 bytes, so longer passwords would be silently cut.
const newPassword = z.string().min(12, "Use at least 12 characters").max(72, "Use at most 72 characters");

export const staffCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(1).max(80),
  role: z.enum(["owner", "manager", "staff"]),
  password: newPassword
});

export const staffUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    role: z.enum(["owner", "manager", "staff"]).optional(),
    isActive: z.boolean().optional(),
    password: newPassword.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to change");
