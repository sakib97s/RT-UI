import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { Popup } from '../../interfaces/common/popup.interface';
import { ThemeViewSetting } from '../../interfaces/common/setting.interface';
import { ShopInformation } from '../../interfaces/common/shop-information.interface';
import { PopupService } from '../../services/common/popup.service';
import { ProductService } from '../../services/common/product.service';
import { SeoPageService } from '../../services/common/seo-page.service';
import { SettingService } from '../../services/common/setting.service';
import { ShopInformationService } from '../../services/common/shop-information.service';
import { TagService } from '../../services/common/tag.service';
import { AppConfigService } from '../../services/core/app-config.service';
import { CanonicalService } from '../../services/core/canonical.service';
import { StorageService } from '../../services/core/storage.service';
import { FooterXl1Component } from '../../shared/components/core/footer/footer-xl/footer-xl-1/footer-xl-1.component';
import { FooterXl2Component } from '../../shared/components/core/footer/footer-xl/footer-xl-2/footer-xl-2.component';
import { FooterXl3Component } from '../../shared/components/core/footer/footer-xl/footer-xl-3/footer-xl-3.component';
import { FooterXl4Component } from '../../shared/components/core/footer/footer-xl/footer-xl-4/footer-xl-4.component';
import { FooterXl5Component } from '../../shared/components/core/footer/footer-xl/footer-xl-5/footer-xl-5.component';
import { PopupDialogComponent } from '../../shared/dialog/popup-dialog/popup-dialog.component';
import { Banner1Component } from './all-banner/banner-1/banner-1.component';
import { BlogComponent } from './blog/blog.component';
import { Showcase2Component } from './showcases/showcase-2/showcase-2.component';
import { Showcase3Component } from './showcases/showcase-3/showcase-3.component';
import { Showcase4Component } from './showcases/showcase-4/showcase-4.component';
import { Showcase5Component } from './showcases/showcase-5/showcase-5.component';
import { TagProductsComponent } from './tag-products/tag-products.component';
import { Blog } from '../../interfaces/common/blog.interface';
import { Product } from '../../interfaces/common/product.interface';
import { BlogService } from '../../services/common/blog.service';
import { CurrencyService } from '../../services/core/currency.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    Showcase2Component,
    Banner1Component,
    FooterXl2Component,
    FooterXl1Component,
    FooterXl3Component,
    BlogComponent,
    FooterXl4Component,
    Showcase4Component,
    FooterXl5Component,
    Showcase5Component,
    RouterModule,
    TagProductsComponent
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  @Input() index: number = 0;

  // Store data
  isTagProduct: boolean;
  popup: Popup;
  tags: any[] = [];
  shopInfo: ShopInformation;
  products: any[] = [];
  tours: Product[] = [];
  tickets: Product[] = [];
  blogs: Blog[] = [];
  features = [
    { icon: '🎭', title: 'Expert Local Guides', desc: 'All our guides are certified historians and passionate storytellers.' },
    { icon: '⚡', title: 'Skip the Lines', desc: 'Priority access so you spend more time exploring, less time waiting.' },
    { icon: '🔒', title: 'Secure Booking', desc: 'Your payment is 100% secure with industry-standard encryption.' },
    { icon: '💬', title: '24/7 WhatsApp', desc: 'Lost tourists can reach us instantly via WhatsApp, day or night.' },
  ];
  reviews = [
    {
      title: 'Atención Y Servicio',
      rating: 5,
      date: 'June 11, 2026',
      text: 'Ramon muy amable y el valor de las cosas que no podian ingresar a la capilla',
      author: 'Ramon',
      country: 'Spain',
      verified: true
    },
    {
      title: 'Highly Recommended!',
      rating: 5,
      date: 'June 8, 2026',
      text: 'We book the day the tour Vatican Museums, St Peter\'s Basilica and Sistine Chapel tour and our guide was Sylvia. She showed us to bypass front long queues of other tourists on the way in and also during parts of the tour, giving us so much more useful time to see other parts...',
      author: 'Dave',
      country: 'Italy',
      verified: true
    },
    {
      title: 'Wonderful Tour Experience',
      rating: 5,
      date: 'May 28, 2026',
      text: 'Great experience booking a Colosseum and Ancient Rome tour. The process was simple, check-in was fast, and the guide made history come alive!',
      author: 'Sarah M.',
      country: 'United Kingdom',
      verified: true
    }
  ];
  promoOffers: any[] = [];
  campaignProducts: any[] = [];
  campaignBannerUrl: string;
  campaignTitle: string;
  campaignEndDate?: string;
  visibleProducts = 5;

  /** শুধু এই shop id-গুলোর product দেখাতে চাই */
  allowedShopIds: string[] = ['696904362f97b639a4d49127', '679511745a429b7bb55421c4'];

  private observer!: IntersectionObserver;

  // Loading
  isLoading: boolean = true;

  // Theme Settings
  showcaseViews: string;
  productViews: string;
  themeColors: any;
  seoPageData: any;
  isEnableHomeRecentOrder: any;
  isEnableBlog: any;
  isEnableCheckoutOrderModal: any;
  footerViews: string;

  // Pagination
  currentPage = 1;
  totalProducts = 0;
  productsPerPage = null;

  private _endReloadTimer?: number;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly canonicalService = inject(CanonicalService);
  private readonly storageService = inject(StorageService);
  private readonly popupService = inject(PopupService);
  private readonly tagService = inject(TagService);
  private readonly seoPageService = inject(SeoPageService);
  private readonly dialog = inject(MatDialog);
  private readonly shopInfoService = inject(ShopInformationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingService = inject(SettingService);
  private readonly productService = inject(ProductService);
  private readonly blogService = inject(BlogService);
  public readonly currencyService = inject(CurrencyService);
  private readonly el = inject(ElementRef);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Theme Settings
    this.getSettingData();

    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    } else {
      // Fallback for SSR - Load without intersection
      this.loadProducts();
    }

    if (this.isTagProduct) {
      this.getAllTags();
    }

    this.popupView();

    if (isPlatformBrowser(this.platformId)) {
      // this.updateMetaData();
      this.getShopInfo();
    }

    this.getAllSeoPage();
    this.getSetting();
    //    this.getPromoOffers();

    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => {
        if (result.matches) {
          this.visibleProducts = 6; // Show 6 items on mobile
        } else {
          this.visibleProducts = 5; // Show 5 items on desktop
        }
      });
  }

  /**
   * Initial Landing Page Setting
   * getSettingData()
   */
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadProducts();
          this.observer.disconnect();
        }
      });
    });
    this.observer.observe(this.el.nativeElement);
  }

  private getSettingData() {
    const themeViewSettings: ThemeViewSetting[] =
      this.appConfigService.getSettingData('themeViewSettings');

    this.productViews = themeViewSettings
      .find((f) => f.type == 'productViews')
      ?.value?.join();

    this.showcaseViews = themeViewSettings
      .find((f) => f.type == 'showcaseViews')
      ?.value?.join();

    this.themeColors = this.appConfigService.getSettingData('themeColors');
    this.isTagProduct = this.productViews.split(',').includes('Tag');

    this.footerViews =
      themeViewSettings.find((f) => f.type === 'footerViews')?.value?.join() ||
      '';
  }

  /**
   * Footer
   * getShopInfo()
   */
  private getShopInfo() {
    setTimeout(() => {
      const subscription = this.shopInfoService.getShopInformation().subscribe({
        next: (res) => {
          this.shopInfo = res.data;
        },
        error: (err) => {
          console.error(err);
        },
      });
      this.subscriptions?.push(subscription);
    }, 500); // 0.5 seconds delay
  }

  /**
   * Allowed Shops Check (UI শর্ত)
   * ফিল্টার করার পর এখানে শুধু length চেক করলেই যথেষ্ট
   */
  isShopAllowed(): boolean {
    const currentShopId = this.getCurrentShopId();
    return !!currentShopId && this.allowedShopIds.includes(currentShopId);
  }

  /**
   * Check if footer should be hidden on mobile for specific shop
   * Hide footer on mobile for shop ID: 695fa558183bf1873297f69e
   */
  get shouldHideFooterOnMobile(): boolean {
    const currentShopId = this.appConfigService.getSettingData('shop');
    const isMobile = this.breakpointObserver.isMatched('(max-width: 599px)');
    return currentShopId === '695fa558183bf1873297f69e' && isMobile;
  }

  private getSetting() {
    const subscription = this.settingService
      .getSetting('orderSetting blog')
      .subscribe({
        next: (res) => {
          this.isEnableHomeRecentOrder =
            res.data?.orderSetting?.isEnableHomeRecentOrder;
          this.isEnableBlog = res.data?.blog?.isEnableBlog;
          this.isEnableCheckoutOrderModal = res.data?.orderSetting?.isEnableCheckoutOrderModal;
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions.push(subscription);
  }

  loadProducts() {
    this.getHomeProducts();
    this.getHomeBlogs();
  }

  getHomeProducts() {
    this.productService.getAllProductsByUi(null, 1, 100).subscribe({
      next: (res) => {
        if (res.success) {
          this.tours = res.data.filter(p => !p.name.toLowerCase().includes('ticket'));
          this.tickets = res.data.filter(p => p.name.toLowerCase().includes('ticket'));
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error fetching home products', err);
        this.isLoading = false;
      }
    });
  }

  getHomeBlogs() {
    this.blogService.getAllBlogs().subscribe({
      next: (res) => {
        if (res.success) {
          this.blogs = res.data;
        }
      },
      error: (err) => {
        console.error('Error fetching blogs', err);
      }
    });
  }

  /**
   * -------- Allowed Shop Filter Helpers --------
   */

  /** _id | { _id } | { $oid } | string—যাই আসুক, string id বানিয়ে দেয় */
  /** _id | { _id } | { $oid } | string → সব কেস থেকেই string ID */
  private normalizeId(val: any): string | null {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val._id === 'string') return val._id;
      if (typeof val.$oid === 'string') return val.$oid;
    }
    return null;
  }

  /** shopInfo থেকে current shop id বের করুন */
  private getCurrentShopId(): string | null {
    // আপনার shopInfo কেমন আসে তার ওপর ভিত্তি করে ৩টা অপশন রাখলাম
    return (
      this.normalizeId(this.shopInfo?._id) ||
      this.normalizeId((this.shopInfo as any)?.shop) ||
      this.normalizeId((this.shopInfo as any)?.shop?._id)
    );
  }


  /**
   * Campaign end-time এ reload logic
   */
  setCampaign(first: { endDateTime?: string }) {
    this.campaignEndDate = first.endDateTime;

    if (this.campaignEndDate) {
      const end = new Date(this.campaignEndDate); // ISO → Date
      const now = new Date();
      const msLeft = end.getTime() - now.getTime();

      // আগেই শেষ হয়ে গেলে, সঙ্গে সঙ্গে reload
      if (msLeft <= 0) {
        this.reloadAfterEnd();
      } else {
        // আগের কোনো টাইমার থাকলে ক্লিয়ার
        if (this._endReloadTimer) {
          clearTimeout(this._endReloadTimer);
        }
        // end time এ পৌঁছালে একবার reload
        this._endReloadTimer = window.setTimeout(() => {
          this.reloadAfterEnd();
        }, msLeft);
      }
    }
  }

  private reloadAfterEnd() {
    // চাইলে এখানে শুধু ডাটা রিফেচও করতে পারেন
    window.location.reload();
  }

  /**
   * Popup Logic
   * popupView()
   */
  private popupView() {
    const isClosePopupDialog =
      this.storageService.getDataFromSessionStorage('POPUP_DIALOG');
    if (!isClosePopupDialog) {
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          this.getPopup();
        }, 2000);
      }
    }
  }

  /**
   * Dialog View
   * openPopupDialog()
   */
  openPopupDialog() {
    const dialogRef = this.dialog.open(PopupDialogComponent, {
      data: this.popup,
      maxWidth: '600px',
      width: '100%',
      maxHeight: '600px',
      panelClass: ['dialog', 'offer-dialog'],
    });
    const subscription = dialogRef.afterClosed().subscribe(() => {
      this.storageService.storeDataToSessionStorage('POPUP_DIALOG', true);
    });
    this.subscriptions?.push(subscription);
  }

  /**
   * HTTP Req Handle
   * getAllTags()
   * getPopup()
   */
  getAllTags() {
    const subscription = this.tagService.getAllTags().subscribe({
      next: (res) => {
        this.tags = res.data;
      },
      error: (err) => {
        console.log(err);
      },
    });
    this.subscriptions?.push(subscription);
  }

  private getPopup() {
    const subscription = this.popupService.getPopup().subscribe({
      next: (res) => {
        if (res.success) {
          this.popup = res.data;
          if (this.popup) {
            this.openPopupDialog();
          }
        }
      },
      error: (err) => {
        console.log(err);
      },
    });
    this.subscriptions?.push(subscription);
  }

  private getAllSeoPage() {
    const subscription = this.seoPageService
      .getAllSeoPageByUi({ status: 'publish', type: 'home-page' }, 1, 1)
      .subscribe({
        next: (res) => {
          this.seoPageData = res.data[0];
          if (isPlatformBrowser(this.platformId)) {
            this.updateMetaData();
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions.push(subscription);
  }

  /**
   * updateMetaData()
   */
  private updateMetaData() {
    // Extract product information for reuse
    const seoTitle = this.seoPageData?.seoTitle
      ? this.seoPageData?.seoTitle
      : 'Home';
    const seoDescription = this.seoPageData?.seoDescription
      ? this.seoPageData?.seoDescription
      : this.seoPageData?.name;
    const imageUrl = this.seoPageData?.images
      ? this.seoPageData?.images[0]
      : ''; // Default to an empty string if no image is available
    const seoKeywords = this.seoPageData?.seoKeyword || ''; // Example: "organic honey, pure honey, raw honey"
    const url = window.location.href;

    // Title
    this.title.setTitle(seoTitle);

    // Meta Tags
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({
      name: 'theme-color',
      content: this.themeColors?.primary,
    });
    this.meta.updateTag({ name: 'description', content: seoDescription });
    this.meta.updateTag({ name: 'keywords', content: seoKeywords });

    // Open Graph (og:)
    this.meta.updateTag({ property: 'og:title', content: seoTitle });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' }); // Recommended width
    this.meta.updateTag({ property: 'og:image:height', content: '630' }); // Recommended height
    this.meta.updateTag({
      property: 'og:description',
      content: seoDescription,
    });
    this.meta.updateTag({ property: 'og:locale', content: 'en_US' });

    // Twitter Tags
    this.meta.updateTag({ name: 'twitter:title', content: seoTitle });
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({
      name: 'twitter:description',
      content: seoDescription,
    });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl }); // Image for Twitter

    // Microsoft
    this.meta.updateTag({ name: 'msapplication-TileImage', content: imageUrl });

    // Canonical
    this.canonicalService.setCanonicalURL();
  }

  /**
   * ON Destroy
   */
  ngOnDestroy() {
    if (this._endReloadTimer) {
      clearTimeout(this._endReloadTimer);
    }
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
