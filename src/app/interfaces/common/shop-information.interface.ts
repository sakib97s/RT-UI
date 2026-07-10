export interface ShopInformation {
  _id?: string;
  shortDescription?: string;
  siteLogo?: string;
  fabIcon?: string;
  isShow?: boolean;
  shopId?: string;
  poweredby?: string;
  logoPrimary?: string;
  websiteName?: string;
  whatsappNumber?: string;
  addresses: ShopObject[];
  emails?: ShopObject[];
  phones: ShopObject[];
  downloadUrls: ShopObject[];
  socialLinks: ShopObject[];
  navLogo?: string;
  footerLogo?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  footerBgTextHoverColor?: string;
  headerBgColor?: string;
  headerBgTextColor?: string;
  headerBgTextHoverColor?: string;
  categoryPdfFile?: string;
  othersLogo?: string;
  showBranding?: boolean;
  brandingText?: [null];
  quickLinksHeading?: string;
  usefulLinksHeading?: string;
  quickLinksPages?: string[]; // Array of page slugs for Quick Links section
  usefulLinksPages?: string[]; // Array of page slugs for Useful Links section
}

export interface ShopObject {
  type: number;
  value: string;
}
