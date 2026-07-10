import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, OnDestroy, OnInit, PLATFORM_ID, } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Category } from '../../interfaces/common/category.interface';
import { Product } from '../../interfaces/common/product.interface';
import { ThemeViewSetting } from '../../interfaces/common/setting.interface';
import { FilterData, FilterGroup } from '../../interfaces/core/filter-data';
import { Pagination } from '../../interfaces/core/pagination';
import { ProductService } from '../../services/common/product.service';
import { SeoPageService } from '../../services/common/seo-page.service';
import { AppConfigService } from '../../services/core/app-config.service';
import { CanonicalService } from '../../services/core/canonical.service';
import { ProductCard1Component } from '../../shared/components/product-cards/product-card-1/product-card-1.component';
import { ProductCard2Component } from '../../shared/components/product-cards/product-card-2/product-card-2.component';
import { ProductCard3Component } from '../../shared/components/product-cards/product-card-3/product-card-3.component';
import { ProductCard4Component } from '../../shared/components/product-cards/product-card-4/product-card-4.component';
import { EmptyDataComponent } from '../../shared/components/ui/empty-data/empty-data.component';
import { OutSideClickDirective } from '../../shared/directives/out-side-click.directive';
import { ProductCardLoaderComponent } from '../../shared/loader/product-card-loader/product-card-loader.component';
import {
  ProductDetailsCategoryLoaderComponent
} from '../../shared/loader/product-details-category-loader/product-details-category-loader.component';
import { ProductCard5Component } from "../../shared/components/product-cards/product-card-5/product-card-5.component";
import { SettingService } from "../../services/common/setting.service";
import { CurrencyService } from "../../services/core/currency.service";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  standalone: true,
  imports: [
    ProductDetailsCategoryLoaderComponent,
    ProductCard1Component,
    ProductCardLoaderComponent,
    EmptyDataComponent,
    ProductCard2Component,
    ProductCard3Component,
    ProductCard4Component,
    OutSideClickDirective,
    RouterModule,
  ],
})
export class ProductsComponent implements OnInit, OnDestroy {
  // Theme Views
  productCardViews: string;
  productsCategoryViews: string;

  // Scroll
  isHeaderTopHidden: boolean = false;

  // Store Data
  products: Product[] = [];
  categorySlide = false;
  selectedCategory?: string;
  categories: Category[] = [];
  selectedCategories: string[] = [];
  selectedSubCategories: string[] = [];
  selectedChildCategories: string[] = []; // Selected child categories for filtering
  selectedBrands: string[] = [];
  selectedTags: string[] = [];
  searchQuery: string = null;
  isLoadMore = false;
  seoPageData: any;
  themeColors: any;
  isEnableCheckoutOrderModal: any;

  // Loading
  isLoading = true;

  // Pagination
  currentPage = 1;
  totalProducts = 0;
  productsPerPage = 16;

  // Special shop IDs that should use pagination with 52 products per page
  private readonly specialShopIds: string[] = [
    '690c2389d71f4cf10fe34fe4',
    '690c2389d71f4cf10fe34fe5',
    '692d89a8597c97480fcceb9f',
    '68ff6b842c278fbae78c08e0'
  ];

  // Computed property to check if current shop should use pagination
  get shouldUsePagination(): boolean {
    const shopId = this.appConfigService.getSettingData('shop');
    return this.specialShopIds.includes(shopId);
  }

  // Sort
  sortQuery = { priority: -1 };
  activeSort: number = null;

  // Complex Filter
  categoryFilterArray: any[] = [];
  subCategoryFilterArray: any[] = [];
  childCategoryFilterArray: any[] = []; // Child category filter array for complex filtering
  brandFilterArray: any[] = [];
  tagFilterArray: any[] = [];
  ratingFilterArray: any[] = [];
  priceFilterArray: any[] = [];

  // FilterData
  filter: any = null;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly productService = inject(ProductService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly canonicalService = inject(CanonicalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly seoPageService = inject(SeoPageService);
  private readonly settingService = inject(SettingService);
  public readonly currencyService = inject(CurrencyService);

  // Subscription
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.getSetting();

    // Set products per page based on shop ID
    this.updateProductsPerPage();

    // GET PAGE FROM QUERY PARAM
    const subscription = this.activatedRoute.queryParams.subscribe((qParam) => {
      // Search Query
      this.searchQueryFromQueryParam(qParam);

      // Filter Query (will reset page to 1 only if filters are being applied)
      this.filterQueryFromQueryParam(qParam);

      // Get page from query params if using pagination (after filter processing)
      if (this.shouldUsePagination && qParam && qParam['page']) {
        this.currentPage = Number(qParam['page']) || 1;
      }

      // Fetch data
      this.getAllProducts();
    });
    this.subscriptions?.push(subscription);

    if (isPlatformBrowser(this.platformId)) {
      this.updateMetaData();
    }

    // Theme Base
    this.getSettingData();
    this.getAllSeoPage();
  }

  /**
   * Update products per page based on shop ID
   */
  private updateProductsPerPage(): void {
    if (this.shouldUsePagination) {
      this.productsPerPage = 52;
    } else {
      this.productsPerPage = 16;
    }
  }

  onContinueShopping(): void {
    this.filter = null;
    this.categoryFilterArray = [];
    this.subCategoryFilterArray = [];
    this.brandFilterArray = [];
    this.tagFilterArray = [];
    this.ratingFilterArray = [];
    this.priceFilterArray = [];
    this.selectedCategories = [];
    this.selectedSubCategories = [];
    this.selectedBrands = [];
    this.selectedTags = [];
    this.searchQuery = null;
    this.currentPage = 1;
    this.getAllProducts();
  }

  /**
   * HTTP Request Handle
   * getAllProducts()
   * getAllCategory()
   * getSettingData()
   */
  private getAllProducts(loadMore?: boolean) {
    const pagination: Pagination = {
      pageSize: Number(this.productsPerPage),
      currentPage: Number(this.currentPage) - 1,
    };
    // Select
    const mSelect = {
      name: 1,
      isVariation: 1,
      images: 1,
      tags: 1,
      slug: 1,
      category: 1,
      subCategory: 1,
      brand: 1,
      salePrice: 1,
      regularPrice: 1,
      totalSold: 1,
      variation: 1,
      variation2: 1,
      discountType: 1,
      ratingCount: 1,
      ratingTotal: 1,
      reviewTotal: 1,
      quantity: 1,
      variationOptions: 1,
      variation2Options: 1,
      variationList: 1,
      discountAmount: 1,
      minimumWholesaleQuantity: 1,
      wholesalePrice: 1,
    };
    const mGroup: FilterGroup = {
      isGroup: true,
      category: true,
      subCategory: true,
      brand: true,
    };

    // Compleax Filter Array Based on Selections
    const comFilter: any[] = [];
    if (this.categoryFilterArray.length) {
      comFilter.push({ $or: this.categoryFilterArray });
    }

    if (this.subCategoryFilterArray.length) {
      comFilter.push({ $or: this.subCategoryFilterArray });
    }

    if (this.childCategoryFilterArray.length) {
      comFilter.push({ $or: this.childCategoryFilterArray });
    }

    if (this.brandFilterArray.length) {
      comFilter.push({ $or: this.brandFilterArray });
    }

    if (this.tagFilterArray.length) {
      comFilter.push({ $or: this.tagFilterArray });
    }

    if (this.ratingFilterArray.length) {
      comFilter.push({ $or: this.ratingFilterArray });
    }

    if (this.priceFilterArray.length) {
      comFilter.push({ $or: this.priceFilterArray });
    }

    let mFilter;
    if (comFilter.length) {
      mFilter = {
        ...this.filter,
        ...{
          $and: comFilter,
        },
      };
    } else {
      mFilter = this.filter;
    }

    const filterData: FilterData = {
      pagination: pagination,
      filter: { ...mFilter, status: 'publish' },
      filterGroup: null,
      select: mSelect,
      sort: this.sortQuery,
    };

    const subscription = this.productService
      .getAllProducts(filterData, this.searchQuery)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.isLoadMore = false;
          if (loadMore) {
            this.products = [...this.products, ...res.data];
          } else {
            this.products = res.data;
          }

          this.totalProducts = res.count;

          // if (!loadMore) {
          //   if (!this.productFilterGroup) {
          //     this.productFilterGroup = res.filterGroup;
          //   }
          //   if (this.productFilterGroup) {
          //     if (this.selectedCategories.length) {
          //       this.checkCategoryFilter();
          //     }
          //     if (this.selectedSubCategories.length) {
          //       this.checkSubCategoryFilter();
          //     }
          //     if (this.selectedBrands.length) {
          //       this.checkBrandFilter();
          //     }
          //   }
          // }
          this.updateMetaData();
        },
        error: (err) => {
          this.isLoading = false;
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }



  private getSettingData() {
    const themeViewSettings: ThemeViewSetting[] =
      this.appConfigService.getSettingData('themeViewSettings');
    if (themeViewSettings) {
      // Get product card views setting
      const productCardSetting = themeViewSettings.find(
        (f) => f.type === 'productCardViews'
      );
      if (productCardSetting) {
        this.productCardViews = productCardSetting.value.join();
      }

      // Get products category views setting
      const productsCategorySetting = themeViewSettings.find(
        (f) => f.type === 'productsCategoryViews'
      );
      if (productsCategorySetting) {
        this.productsCategoryViews = productsCategorySetting.value.join();
      } else {
        // Default to original category view if setting doesn't exist
        this.productsCategoryViews = 'Products Category View 1';
      }
    }
    this.themeColors = this.appConfigService.getSettingData('themeColors');
  }


  private getSetting() {
    const subscription = this.settingService
      .getSetting('orderSetting')
      .subscribe({
        next: (res) => {
          this.isEnableCheckoutOrderModal = res.data?.orderSetting?.isEnableCheckoutOrderModal;
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions.push(subscription);
  }
  /**
   * searchQueryFromQueryParam()
   * filterQueryFromQueryParam()
   */

  private searchQueryFromQueryParam(qParam: any) {
    if (qParam && qParam['searchQuery']) {
      this.searchQuery = qParam['searchQuery'];
    } else {
      this.searchQuery = null;
    }
  }

  private filterQueryFromQueryParam(qParam: any) {
    // Only reset page if not using pagination or if filters are being applied
    // When using pagination, page will be set from query params separately
    if (!this.shouldUsePagination) {
      this.currentPage = 1;
    } else {
      // For pagination shops, only reset if filters are present in query params
      // This means filters are being applied/changed
      const hasFilterParams = qParam && (
        qParam['categories'] ||
        qParam['subCategories'] ||
        qParam['childCategories'] ||
        qParam['brand'] ||
        qParam['tag']
      );
      if (hasFilterParams) {
        this.currentPage = 1;
      }
    }
    if (qParam && qParam && qParam['categories']) {
      if (typeof qParam['categories'] === 'string') {
        this.selectedCategories = [qParam['categories']];
      } else {
        this.selectedCategories = qParam['categories'];
      }
      this.categoryFilterArray = this.selectedCategories.map((m) => {
        return { 'category.slug': m };
      });
    }

    if (qParam && qParam['subCategories']) {
      if (typeof qParam['subCategories'] === 'string') {
        this.selectedSubCategories = [qParam['subCategories']];
      } else {
        this.selectedSubCategories = qParam['subCategories'];
      }
      this.subCategoryFilterArray = this.selectedSubCategories.map((m) => {
        return { 'subCategory.slug': m };
      });

    }
    if (qParam && qParam['childCategories']) {
      if (typeof qParam['childCategories'] === 'string') {
        this.selectedChildCategories = [qParam['childCategories']];
      } else {
        this.selectedChildCategories = qParam['childCategories'];
      }
      this.childCategoryFilterArray = this.selectedChildCategories.map((m) => {
        return { 'childCategory.slug': m };
      });
    }

    if (qParam && qParam['brand']) {
      if (typeof qParam['brand'] === 'string') {
        this.selectedBrands = [qParam['brand']];
      } else {
        this.selectedBrands = qParam['brand'];
      }
      this.brandFilterArray = this.selectedBrands.map((m) => {
        return { 'brand.slug': m };
      });
    }
    if (qParam && qParam['tag']) {
      if (typeof qParam['tag'] === 'string') {
        this.selectedTags = [qParam['tag']];
      } else {
        this.selectedTags = qParam['tag'];
      }
      this.tagFilterArray = this.selectedTags.map((m) => {
        return { 'tags.name': m };
      });
    }
  }


  /**
   * SORTING
   */
  sortData(query: any, type: number) {
    this.sortQuery = query;
    this.activeSort = type;
    this.getAllProducts();
  }

  onPriceRangeChange(data: any) {
    this.priceFilterArray = [data];
    this.getAllProducts();
  }

  /**
   * RESET FILTER
   * resetCategoryFilter()
   * resetSubCategoryFilter()
   * resetBrandFilter()
   */

  resetCategoryFilter() {
    this.selectedCategories = [];
    this.categoryFilterArray = [];

    // Also clear sub-categories and child categories when categories are reset
    this.selectedSubCategories = [];
    this.subCategoryFilterArray = [];

    this.selectedChildCategories = [];
    this.childCategoryFilterArray = [];

    this.router.navigate(['/products'], {
      queryParams: { categories: [], subCategories: [], childCategories: [] },
      queryParamsHandling: '',
    });
  }

  selectedFilter() { }

  resetSubCategoryFilter() {
    this.selectedSubCategories = [];
    this.subCategoryFilterArray = [];

    // Also clear child categories when sub-categories are reset
    this.selectedChildCategories = [];
    this.childCategoryFilterArray = [];

    this.router.navigate(['/products'], {
      queryParams: { subCategories: [], childCategories: [] },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Reset child category filter
   */
  resetChildCategoryFilter() {
    this.selectedChildCategories = [];
    this.childCategoryFilterArray = [];
    this.router.navigate(['/products'], {
      queryParams: { childCategories: [] },
      queryParamsHandling: 'merge',
    });
  }


  resetBrandFilter() {
    this.selectedCategories = [];
    this.selectedSubCategories = [];
    this.selectedBrands = [];
    this.brandFilterArray = [];
    this.router.navigate(['/products'], {
      queryParams: { brand: [] },
      queryParamsHandling: '',
    });
  }

  /*Toggle on show and feature item*/
  dropdownSortOpen: boolean = false;
  selectedSortValue: string = '';
  sortOptions: string[] = ['Low to High', 'High to Low'];

  toggleDropdownSort() {
    this.dropdownSortOpen = !this.dropdownSortOpen;
    this.cdr.detectChanges();
  }

  selectSortOption(option: string, event: Event) {
    event.stopPropagation(); // Prevent event bubbling
    this.selectedSortValue = option;
    this.dropdownSortOpen = false;
    if (this.selectedSortValue === 'Low to High') {
      this.sortData({ salePrice: 1 }, 3);
    } else {
      this.sortData({ salePrice: -1 }, 4);
    }
  }

  // Detects outside click and closes the dropdown
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const targetElement = event.target as HTMLElement;
    if (targetElement && !targetElement.closest('.custom-select')) {
      this.dropdownSortOpen = false; // Close the dropdown if the click is outside
    }
  }

  /*Toggle on show and feature item ends here*/

  onShowCategory() {
    this.categorySlide = true;
    this.toggleAppChromeVisibility(true);
  }

  onHideCategory() {
    this.categorySlide = false;
    // this.selectedCategory = null;
    this.toggleAppChromeVisibility(false);
  }

  onHideCategoryMouseMove() {
    setTimeout(() => {
      if (this.categorySlide && this.selectedCategory) {
        this.categorySlide = false;
        this.selectedCategory = null;
        this.toggleAppChromeVisibility(false);
      }
    }, 100);
  }

  /**
   * LOAD MORE
   */
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (this.shouldUsePagination) {
      return;
    }
    if (isPlatformBrowser(this.platformId)) {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollPosition + windowHeight >= documentHeight - 800) {
        if (!this.isLoadMore && this.totalProducts > this.products.length) {
          this.onLoadMore();
        }
      }
    }
  }

  onLoadMore() {
    if (this.totalProducts > this.products.length) {
      this.isLoadMore = true;
      this.currentPage += 1;
      this.getAllProducts(true);
    }
  }

  /**
   * PAGINATION METHODS
   */
  get totalPages(): number {
    return Math.ceil(this.totalProducts / this.productsPerPage);
  }

  get visiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 10) {
      // Show all pages if 10 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current <= 5) {
        // Show pages 2-10, then ellipsis, then last 2 pages
        for (let i = 2; i <= 10; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total - 1);
        pages.push(total);
      } else if (current >= total - 4) {
        // Show first page, ellipsis, then last 9 pages
        pages.push('...');
        for (let i = total - 8; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // Show first page, ellipsis, current-2 to current+2, ellipsis, last 2 pages
        pages.push('...');
        for (let i = current - 2; i <= current + 2; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total - 1);
        pages.push(total);
      }
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { page: page },
        queryParamsHandling: 'merge',
      });
      this.getAllProducts();
      // Scroll to top
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Helper method to check if page is a number
   */
  isPageNumber(page: number | string): page is number {
    return typeof page === 'number';
  }

  /**
   * Helper method to handle page click
   */
  onPageClick(page: number | string): void {
    if (this.isPageNumber(page)) {
      this.goToPage(page);
    }
  }

  private getAllSeoPage() {
    const subscription = this.seoPageService
      .getAllSeoPageByUi({ status: 'publish', type: 'product-list-page' }, 1, 1)
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
    // Only run in browser environment (not during SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Extract product information for reuse
    const seoTitle = this.seoPageData?.seoTitle
      ? this.seoPageData?.seoTitle
      : 'Our Products';
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
   * Handle category selection changes from nested category view
   */
  onCategorySelectionChange(categories: string[]) {
    this.selectedCategories = categories;
    // Update filter arrays and reload products
    this.categoryFilterArray = categories.map((slug) => ({
      'category.slug': slug,
    }));
    this.getAllProducts();
  }

  onSubCategorySelectionChange(subCategories: string[]) {
    this.selectedSubCategories = subCategories;
    // Update filter arrays and reload products
    this.subCategoryFilterArray = subCategories.map((slug) => ({
      'subCategory.slug': slug,
    }));
    this.getAllProducts();
  }

  onChildCategorySelectionChange(childCategories: string[]) {
    this.selectedChildCategories = childCategories;
    // Update filter arrays and reload products
    this.childCategoryFilterArray = childCategories.map((slug) => ({
      'childCategory.slug': slug,
    }));
    this.getAllProducts();
  }

  onClearAllFiltersEvent() {
    // Reset all filter arrays and reload products
    this.categoryFilterArray = [];
    this.subCategoryFilterArray = [];
    this.childCategoryFilterArray = [];
    this.getAllProducts();
  }

  /**
   * ON Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
    // Ensure app chrome is restored if leaving while category is open
    this.toggleAppChromeVisibility(false);
  }

  /**
   * Toggle visibility of global header and bottom nav via body class
   */
  private toggleAppChromeVisibility(hide: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      const bodyEl = document?.body;
      if (!bodyEl) {
        return;
      }
      if (hide) {
        bodyEl.classList.add('hide-app-chrome');
      } else {
        bodyEl.classList.remove('hide-app-chrome');
      }
    }
  }
}
