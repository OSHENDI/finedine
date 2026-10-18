export type BranchView = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  address: string;
  phone: string;
  currency: string;
  isOpen: boolean;
};

export type VariantView = {
  id: string;
  name: string;
  nameAr: string | null;
  priceDelta: number;
};

export type AddOnView = {
  id: string;
  name: string;
  nameAr: string | null;
  priceCents: number;
};

export type ProductView = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr: string | null;
  imageUrl: string;
  priceCents: number;
  isAvailable: boolean;
  isFeatured: boolean;
  labels: string;
  variants: VariantView[];
  addOns: AddOnView[];
};

export type CategoryView = {
  id: string;
  nameEn: string;
  nameAr: string;
  products: ProductView[];
};

export type PaymentMethodView = {
  id: string;
  label: string;
  labelAr: string | null;
  type: string;
  accountName: string;
  phone: string;
  details: string;
  detailsAr: string | null;
  isDefault: boolean;
};

export type CartItemView = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  unitCents: number;
  variant?: VariantView;
  addOns: AddOnView[];
};
