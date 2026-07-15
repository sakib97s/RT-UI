import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdditionalPage } from '../../../../../../interfaces/common/additional-page.interface';
import { ShopInformation } from '../../../../../../interfaces/common/shop-information.interface';
import { AdditionalPageService } from '../../../../../../services/common/additional-page.service';
import { AppConfigService } from '../../../../../../services/core/app-config.service';
import { ImgCtrlPipe } from '../../../../../pipes/img-ctrl.pipe';

@Component({
    selector: 'app-footer-xl-1',
    imports: [ImgCtrlPipe, NgOptimizedImage, RouterLink],
    templateUrl: './footer-xl-1.component.html',
    styleUrl: './footer-xl-1.component.scss'
})
export class FooterXl1Component implements OnInit, OnDestroy {
  // Decorator
  @Input() shopInfo: ShopInformation;
  isHomeRoute: boolean = false;
  domain: string = '';
  readonly currentYear = new Date().getFullYear();

  // Store Data
  protected readonly rawSrcset: string = '384w, 640w';
  additionalPages: AdditionalPage[] = [];
  quickLinksPages: AdditionalPage[] = [];
  usefulLinksPages: AdditionalPage[] = [];

  // Shop IDs that should display dynamic footer links
  private readonly dynamicLinksShopIds: string[] = [
    '68d01fa1cb3d60ff3342a532',
    '679511745a429b7bb55421c4', // Example shop ID
  ];

  // Inject
  private readonly platformId = inject(PLATFORM_ID);
  private readonly additionalPageService = inject(AdditionalPageService);
  private readonly appConfigService = inject(AppConfigService);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.isHomeRoute = this.router.url === '/'; // Check if it's the home route
    });

    if (isPlatformBrowser(this.platformId)) {
      this.domain = window.location.host;
      // console.log('[FooterXl1] shopInfo', this.shopInfo);
      this.getAllAdditionalPages();
    }
  }

  /**
   * Get Shop ID
   * getShopId()
   */
  private getShopId(): string {
    return this.appConfigService.getSettingData('shop');
  }

  /**
   * Check if current shop is in the list of shops that should show dynamic links
   * isDynamicLinksShop()
   */
  private isDynamicLinksShop(): boolean {
    const shopId = this.getShopId();
    return shopId ? this.dynamicLinksShopIds.includes(shopId) : false;
  }

  /**
   * Get All Additional Pages
   * getAllAdditionalPages()
   */
  private getAllAdditionalPages() {
    const shopId = this.getShopId();

    if (!shopId) {
      console.warn('Shop ID not found, cannot fetch additional pages');
      return;
    }

    // Only fetch additional pages for the specific shop that needs dynamic links
    if (!this.isDynamicLinksShop()) {
      // For other shops, keep arrays empty so fallback links show
      this.quickLinksPages = [];
      this.usefulLinksPages = [];
      return;
    }

    // Try POST method with filter data and shop ID
    // Use a very high pageSize to get all pages
    // Backend requires non-empty filter object, so we include shop in filter
    const subscription = this.additionalPageService
      .getAllAdditionalPagesByShop(shopId, {
        filter: {
          shop: shopId, // Include shop in filter to satisfy validation
        },
        pagination: {
          pageSize: 1000,
          currentPage: 0,
        },
        select: {
          name: 1,
          slug: 1,
          category: 1,
        },
      })
      .subscribe({
        next: (res) => {
          console.log('Additional pages POST response:', res);
          console.log('Total count from API:', res?.count);
          console.log('Pages received:', res?.data?.length);

          // Handle different response structures
          let pages: AdditionalPage[] = [];

          if (res && Array.isArray(res)) {
            pages = res;
          } else if (res && res.data && Array.isArray(res.data)) {
            pages = res.data;
          } else if (
            res &&
            res.success &&
            res.data &&
            Array.isArray(res.data)
          ) {
            pages = res.data;
          }

          // Check if we got all pages or if there are more
          const totalCount = res?.count || pages.length;
          if (pages.length < totalCount && totalCount > pages.length) {
            console.warn(
              `Only received ${pages.length} pages out of ${totalCount} total. There might be pagination or filtering issues.`
            );
          }

          if (pages.length > 0) {
            this.additionalPages = pages;
            console.log('Loaded additional pages:', this.additionalPages);
            this.filterPagesByCategory();
          } else {
            console.warn(
              'No additional pages found in POST response, trying GET method'
            );
            // Try GET method as fallback
            this.tryGetMethod();
          }
        },
        error: (err) => {
          console.error('Error fetching additional pages via POST:', err);
          // Try GET method as fallback
          this.tryGetMethod();
        },
      });
    this.subscriptions.push(subscription);
  }

  /**
   * Try GET Method
   * tryGetMethod()
   */
  private tryGetMethod() {
    const subscription = this.additionalPageService
      .getAllAdditionalPages()
      .subscribe({
        next: (res) => {
          console.log('Additional pages GET response:', res);
          // Handle different response structures
          let pages: AdditionalPage[] = [];

          if (res && Array.isArray(res)) {
            pages = res;
          } else if (res && res.data && Array.isArray(res.data)) {
            pages = res.data;
          } else if (
            res &&
            res.success &&
            res.data &&
            Array.isArray(res.data)
          ) {
            pages = res.data;
          }

          if (pages.length > 0) {
            this.additionalPages = pages;
            console.log(
              'Loaded additional pages via GET:',
              this.additionalPages
            );
            this.filterPagesByCategory();
          } else {
            console.warn('No additional pages found in GET response either');
          }
        },
        error: (err) => {
          console.error('Error fetching additional pages via GET:', err);
          // Try fallback endpoint
          this.tryFallbackEndpoint();
        },
      });
    this.subscriptions.push(subscription);
  }

  /**
   * Try Fallback Endpoint
   * tryFallbackEndpoint()
   */
  private tryFallbackEndpoint() {
    // Try alternative endpoint 'get-all'
    const subscription = this.additionalPageService
      .getAllAdditionalPages('name slug', 'get-all')
      .subscribe({
        next: (res) => {
          console.log('Fallback additional pages response:', res);
          // Handle different response structures
          let pages: AdditionalPage[] = [];

          if (res && Array.isArray(res)) {
            pages = res;
          } else if (res && res.data && Array.isArray(res.data)) {
            pages = res.data;
          } else if (
            res &&
            res.success &&
            res.data &&
            Array.isArray(res.data)
          ) {
            pages = res.data;
          }

          if (pages.length > 0) {
            this.additionalPages = pages;
            console.log(
              'Loaded additional pages from fallback:',
              this.additionalPages
            );
            this.filterPagesByCategory();
          }
        },
        error: (err) => {
          console.error('Error fetching additional pages from fallback:', err);
        },
      });
    this.subscriptions.push(subscription);
  }

  /**
   * Filter Pages by Category
   * filterPagesByCategory()
   */
  private filterPagesByCategory() {
    // Only show dynamic links for the specific shop ID
    if (!this.isDynamicLinksShop()) {
      // For other shops, keep arrays empty so fallback links show
      this.quickLinksPages = [];
      this.usefulLinksPages = [];
      return;
    }

    console.log('Filtering pages. Total pages:', this.additionalPages.length);

    // Filter pages by category if available, otherwise use shopInfo configuration
    if (
      this.shopInfo?.quickLinksPages &&
      Array.isArray(this.shopInfo.quickLinksPages) &&
      this.shopInfo.quickLinksPages.length > 0
    ) {
      // Use configured page slugs from shopInfo
      this.quickLinksPages = this.additionalPages.filter(
        (page) => page.slug && this.shopInfo.quickLinksPages.includes(page.slug)
      );
    } else {
      // Use category field if available
      const categoryPages = this.additionalPages.filter(
        (page) => page.category === 'quickLinks'
      );
      if (categoryPages.length > 0) {
        this.quickLinksPages = categoryPages;
      } else {
        // Default: Split pages - first half to Quick Links
        const midPoint = Math.ceil(this.additionalPages.length / 2);
        this.quickLinksPages = this.additionalPages.slice(0, midPoint);
      }
    }

    if (
      this.shopInfo?.usefulLinksPages &&
      Array.isArray(this.shopInfo.usefulLinksPages) &&
      this.shopInfo.usefulLinksPages.length > 0
    ) {
      // Use configured page slugs from shopInfo
      this.usefulLinksPages = this.additionalPages.filter(
        (page) =>
          page.slug && this.shopInfo.usefulLinksPages.includes(page.slug)
      );
    } else {
      // Use category field if available
      const categoryPages = this.additionalPages.filter(
        (page) => page.category === 'usefulLinks'
      );
      if (categoryPages.length > 0) {
        this.usefulLinksPages = categoryPages;
      } else {
        // Default: Split pages - second half to Useful Links
        const midPoint = Math.ceil(this.additionalPages.length / 2);
        this.usefulLinksPages = this.additionalPages.slice(midPoint);
      }
    }

    console.log(
      'Quick Links pages:',
      this.quickLinksPages.length,
      this.quickLinksPages
    );
    console.log(
      'Useful Links pages:',
      this.usefulLinksPages.length,
      this.usefulLinksPages
    );
  }

  /**
   * Get Page Display Name
   * getPageName()
   */
  getPageName(page: AdditionalPage): string {
    return page.name || page.title || '';
  }

  /**
   * ON Destroy
   */
  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub?.unsubscribe());
  }

  /**
   * Get Footer Heading
   * getFooterHeading()
   */
  getFooterHeading(type: 'quickLinks' | 'usefulLinks'): string {
    if (type === 'quickLinks') {
      return this.shopInfo?.quickLinksHeading || 'Quick Links';
    } else {
      return this.shopInfo?.usefulLinksHeading || 'Useful Links';
    }
  }

  /**
   * HTTP REQUEST
   * getSocialLink()
   */

  getSocialLink(type: string): string {
    switch (type) {
      case 'facebook':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 0)?.value ?? null
        );

      case 'youtube':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 1)?.value ?? null
        );

      case 'twitter':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 2)?.value ?? null
        );

      case 'instagram':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 3)?.value ?? null
        );

      case 'linkedin':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 4)?.value ?? null
        );

      case 'tiktok':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 5)?.value ?? null
        );
      case 'daraz':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 9)?.value ?? null
        );

      case 'appstore':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 10)?.value ?? null
        );

      case 'playstore':
        return (
          this.shopInfo?.socialLinks.find((f) => f.type === 11)?.value ?? null
        );

      default:
        return null;
    }
  }
}
