import {isPlatformBrowser, NgClass, NgIf, NgFor, NgStyle, NgTemplateOutlet} from '@angular/common';
import {Component, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild, ElementRef, signal, computed} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {Meta, Title} from '@angular/platform-browser';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import {Product, VariationList} from '../../interfaces/common/product.interface';
import {ThemeViewSetting} from '../../interfaces/common/setting.interface';
import {ProductService} from '../../services/common/product.service';
import {ReviewService} from '../../services/common/review.service';
import {UserService} from '../../services/common/user.service';
import {AppConfigService} from '../../services/core/app-config.service';
import {CanonicalService} from '../../services/core/canonical.service';
import {GtmService} from '../../services/core/gtm.service';
import {UtilsService} from '../../services/core/utils.service';
import {CartService} from '../../services/common/cart.service';
import {WishlistService} from '../../services/common/wishlist.service';
import {UiService} from '../../services/core/ui.service';
import {ReloadService} from '../../services/core/reload.service';
import {Cart} from '../../interfaces/common/cart.interface';
import {Wishlist} from '../../interfaces/common/wishlist.interface';
import {PricePipe} from '../../shared/pipes/price.pipe';
import {ProductPricePipe} from '../../shared/pipes/product-price.pipe';
import {CurrencyCtrPipe} from '../../shared/pipes/currency.pipe';
import {TranslatePipe} from '../../shared/pipes/translate.pipe';
import {StarRatingViewComponent} from '../../shared/components/star-rating-view/star-rating-view.component';
import {ProductDetailsDescriptionComponent} from '../../shared/components/product-details-description/product-details-description.component';
import {ProductDetailsReviewsComponent} from './product-details-reviews/product-details-reviews.component';
import {ProductDetailsLoaderComponent} from '../../shared/loader/product-details-loader/product-details-loader.component';
import {CurrencyService} from '../../services/core/currency.service';
import {ShopInformationService} from '../../services/common/shop-information.service';
import {ShopInformation} from '../../interfaces/common/shop-information.interface';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
  standalone: true,
  imports: [
    NgClass, NgIf, NgFor, NgStyle, NgTemplateOutlet,
    FormsModule, ReactiveFormsModule, RouterLink,
    StarRatingViewComponent, ProductDetailsDescriptionComponent,
    ProductDetailsReviewsComponent, ProductDetailsLoaderComponent,
    CurrencyCtrPipe, TranslatePipe, PricePipe, ProductPricePipe
  ],
  providers: [PricePipe, ProductPricePipe]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('zoomViewer') zoomViewer: ElementRef;

  // Store Data
  slug?: string;
  product: Product;
  shop: any;
  shopInfo: ShopInformation;
  currentTab: string = 'description';
  isLoading: boolean = true;

  // RomeVentures detail fields
  adultsCount = signal(2);
  childrenCount = signal(0);
  infantsCount = signal(0);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  activeImg = 0;
  steps = [
    { time: '09:00 AM', desc: 'Meet your guide at the Arch of Constantine.' },
    { time: '09:30 AM', desc: 'Priority access entry to the Colosseum.' },
    { time: '11:00 AM', desc: 'Guided walk through the Roman Forum.' },
    { time: '12:00 PM', desc: 'Tour ends at Palatine Hill.' },
  ];
  totalPrice = computed(() => {
    const basePrice = this.product ? this.product.salePrice : 0;
    return (this.adultsCount() * basePrice) + (this.childrenCount() * basePrice * 0.7);
  });
  
  // Policies (Dynamic fallbacks)
  returnPolicy: string = '3 Days';
  exchangePolicy: string = '3 Days';
  deliveryTime: string = '2 Days';
  paymentMethod: string = 'COD Available';

  // Gallery & Image
  image: string;
  selectedImage: string;
  zoomImage: string;
  currentIndex: number = 0;
  transformStyle: string = 'translateY(0)';
  
  // Cart & Variations
  selectedQty: number = 1;
  selectedVariation: string = null;
  selectedVariation2: string = null;
  selectedVariationList: VariationList = null;
  cartLoader: boolean = false;
  buyNowLoader: boolean = false;
  
  // Wishlist
  wishlist: Wishlist | undefined;
  wishlists: Wishlist[] = [];
  
  // Rating & Reviews
  reviewsCount: number = 0;
  approvedReviewsCount: number = 0;
  approvedReviewsTotal: number = 0;

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly shopInfoService = inject(ShopInformationService);
  private readonly activateRoute = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly userService = inject(UserService);
  private readonly utilsService = inject(UtilsService);
  private readonly uiService = inject(UiService);
  private readonly reloadService = inject(ReloadService);
  private readonly gtmService = inject(GtmService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly canonicalService = inject(CanonicalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly pricePipe = inject(PricePipe);
  public readonly currencyService = inject(CurrencyService);

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.getSettingData();
    this.getShopInfo();
    this.activateRoute.paramMap.subscribe((param) => {
      this.slug = param.get('slug');
      if (this.slug) {
        this.getProductBySlug();
      }
    });

    // Wishlist Sync
    const sub = this.wishlistService.refreshStoredWishList$.subscribe(() => {
      this.wishlists = this.wishlistService.wishlistItems;
      this.checkWishlist();
    });
    this.subscriptions.push(sub);
  }

  private getSettingData() {
    this.shop = this.appConfigService.getSettingData('shop');
    const productSetting = this.appConfigService.getSettingData('productSetting');
    if (productSetting) {
      // You can add more dynamic logic here if needed
    }
  }

  private getShopInfo() {
    const sub = this.shopInfoService.getShopInformation().subscribe({
      next: (res) => {
        this.shopInfo = res.data;
      },
      error: (err) => {
        console.error(err);
      }
    });
    this.subscriptions.push(sub);
  }

  private getProductBySlug() {
    this.isLoading = true;
    const sub = this.productService.getProductBySlug(this.slug).subscribe({
      next: (res) => {
        this.product = res.data;
        if (this.product) {
          this.image = this.product.images[0];
          this.selectedImage = this.product.images[0];
          if (this.product.isVariation) {
            this.setDefaultVariation();
          }
          this.loadReviewData();
          if (isPlatformBrowser(this.platformId)) {
            this.updateMetaData();
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private setDefaultVariation() {
    const def = this.product.variationList?.find(v => v.isDefault);
    if (def) {
      const names = def.name?.split(', ') || [];
      if (this.product.variation && names[0]) this.selectedVariation = names[0].trim();
      if (this.product.variation2 && names[1]) this.selectedVariation2 = names[1].trim();
      if (def.image) {
        this.image = def.image;
        this.selectedImage = def.image;
      }
    }
    this.setSelectedVariationList();
  }

  private setSelectedVariationList() {
    let match = null;
    if (this.selectedVariation && this.selectedVariation2) {
      match = this.product.variationList.find(f => {
        const names = f.name?.split(',').map(s => s.trim()) || [];
        return names.includes(this.selectedVariation) && names.includes(this.selectedVariation2);
      });
    } else if (this.selectedVariation) {
      match = this.product.variationList.find(f => {
        const names = f.name?.split(',').map(s => s.trim()) || [];
        return names.includes(this.selectedVariation);
      });
    }

    this.selectedVariationList = match;

    if (match?.image) {
      this.image = match.image;
      this.selectedImage = match.image;
    }
  }

  onSelectVariation(name: string) {
    this.selectedVariation = name;
    this.setSelectedVariationList();
  }

  onSelectVariation2(name: string) {
    this.selectedVariation2 = name;
    this.setSelectedVariationList();
  }

  getVariationImage(name: string): string {
    if (!this.product?.variationList) return this.product?.images?.[0];
    const variant = this.product.variationList.find(v => {
      const names = v.name?.split(',').map(s => s.trim()) || [];
      return names.includes(name);
    });
    return variant?.image || this.product?.images?.[0];
  }

  getVariation2Image(name: string): string {
    if (!this.product?.variationList) return this.product?.images?.[0];
    const variant = this.product.variationList.find(v => {
      const names = v.name?.split(',').map(s => s.trim()) || [];
      return names.includes(name);
    });
    return variant?.image || this.product?.images?.[0];
  }

  scrollNext(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollBy({ left: 150, behavior: 'smooth' });
    }
  }

  scrollPrev(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollBy({ left: -150, behavior: 'smooth' });
    }
  }

  calculatedRatingDetails: any = {
    five: 0,
    four: 0,
    three: 0,
    two: 0,
    one: 0
  };

  loadReviewData() {
    const filter = { 'product._id': this.product._id, status: true };
    this.reviewService.getAllReviewsByProductId({ filter, pagination: { pageSize: 100, currentPage: 0 } }, null).subscribe(res => {
      this.reviewsCount = res.count || 0;
      this.approvedReviewsCount = res.count || 0;
      const reviews = res.data || [];
      this.approvedReviewsTotal = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);

      // Calculate Breakdown
      this.calculatedRatingDetails = {
        five: reviews.filter(r => Number(r.rating) === 5).length,
        four: reviews.filter(r => Number(r.rating) === 4).length,
        three: reviews.filter(r => Number(r.rating) === 3).length,
        two: reviews.filter(r => Number(r.rating) === 2).length,
        one: reviews.filter(r => Number(r.rating) === 1).length,
      };
    });
  }

  get ratingCount(): number {
    return this.approvedReviewsCount > 0 ? Number((this.approvedReviewsTotal / this.approvedReviewsCount).toFixed(1)) : 0;
  }

  get ratingBreakdown() {
    return this.calculatedRatingDetails;
  }

  getRatingPercentage(count: number): number {
    if (!this.approvedReviewsCount) return 0;
    return (count / this.approvedReviewsCount) * 100;
  }

  get isStockAvailable(): boolean {
    return true;
  }

  onIncrementQty() { this.selectedQty++; }
  onDecrementQty() { if (this.selectedQty > 1) this.selectedQty--; }

  updateCount(id: string, delta: number) {
    if (id === 'adults') {
      const val = Math.max(1, this.adultsCount() + delta);
      this.adultsCount.set(val);
    } else if (id === 'children') {
      const val = Math.max(0, this.childrenCount() + delta);
      this.childrenCount.set(val);
    } else if (id === 'infants') {
      const val = Math.max(0, this.infantsCount() + delta);
      this.infantsCount.set(val);
    }
  }

  onAddToCart(type: 'addToCart' | 'buyNow') {
    this.selectedQty = this.adultsCount() + this.childrenCount() + this.infantsCount();
    
    const data: Cart = {
      product: this.product._id,
      selectedQty: this.selectedQty,
      isSelected: true,
      variation: this.selectedVariationList ? {
        _id: this.selectedVariationList._id,
        name: this.selectedVariationList.name,
        image: this.selectedVariationList.image,
        option: this.product.variation2 ? `${this.product.variation}, ${this.product.variation2}` : this.product.variation,
        sku: this.selectedVariationList.sku
      } : null,
      customFields: {
        size: this.selectedDate(),
        name: `Adults: ${this.adultsCount()}, Children: ${this.childrenCount()}, Infants: ${this.infantsCount()}`
      }
    };

    if (this.userService.isUser) {
      this.cartService.addToCart(data).subscribe(() => {
        this.reloadService.needRefreshCart$(true);
        if (type === 'buyNow') this.router.navigate(['/checkout']);
        else this.uiService.message('Added to cart', 'success');
      });
    } else {
      this.cartService.addCartItemToLocalStorage(data);
      this.reloadService.needRefreshCart$(true);
      if (type === 'buyNow') this.router.navigate(['/checkout']);
      else this.uiService.message('Added to cart', 'success');
    }
  }

  onAddToWishlist() {
    if (!this.userService.isUser) {
      this.router.navigate(['/login']);
      return;
    }
    if (this.wishlist) {
      this.wishlistService.deleteWishlistById(this.wishlist._id).subscribe(() => {
        this.reloadService.needRefreshWishList$();
      });
    } else {
      this.wishlistService.addToWishlist({product: this.product._id, selectedQty: 1} as any).subscribe(() => {
        this.reloadService.needRefreshWishList$();
      });
    }
  }

  private checkWishlist() {
    this.wishlist = this.wishlists.find(f => (f.product as any)?._id === this.product?._id);
  }

  selectImage(img: string) {
    this.selectedImage = img;
    this.image = img;
  }

  toggleTab(tab: string) {
    this.currentTab = tab;
  }

  private updateMetaData() {
    const title = this.product.seoTitle || this.product.name;
    this.title.setTitle(title);
    this.meta.updateTag({name: 'description', content: this.product.seoDescription || this.product.name});
    this.canonicalService.setCanonicalURL();
  }

  isArray(obj: any): boolean {
    return Array.isArray(obj);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
