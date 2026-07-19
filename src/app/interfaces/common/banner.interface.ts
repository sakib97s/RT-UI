export interface Banner {
  _id?: string;
  name?: string;
  title?: string;
  images?: string[];
  url?: string;
  videoUrl?: string;
  type?: string;
  urlType?: string;
  bannerType?: string;
  showHome?: boolean;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  select?: boolean;
}
