import { Product } from './product.interface';

export interface PromoOffer {
  _id?: string;
  title?: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  products?: PromoOfferProduct[];
  createdAt?: Date;
  updatedAt?: Date;
  productCount?: number;
  select?: boolean;
  status?: string;
  mobileImage?: string;
  offerType?: string;
  serial?: number;
}

interface PromoOfferProduct {
  isShowInHome: boolean;
  product: string | Product;
  offerDiscountAmount?: number;
  offerDiscountType?: number;
  resetDiscount?: boolean;
  title?: string;
  titleImg?: string;
}
