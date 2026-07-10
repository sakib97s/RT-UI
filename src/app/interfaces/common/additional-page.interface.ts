export interface AdditionalPage {
  _id?: string | number;
  title?: string;
  name?: string;
  slug?: string;
  description?: string;
  isHtml?: boolean;
  category?: string; // For grouping pages (e.g., 'quickLinks', 'usefulLinks')
  createdAt?: Date;
  updatedAt?: Date;
}
