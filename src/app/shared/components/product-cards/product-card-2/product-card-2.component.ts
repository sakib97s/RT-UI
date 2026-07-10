import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  SimpleChanges,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Cart } from '../../../../interfaces/common/cart.interface';
import {
  Product,
  VariationList,
} from '../../../../interfaces/common/product.interface';
import { Wishlist } from '../../../../interfaces/common/wishlist.interface';
import { CartService } from '../../../../services/common/cart.service';
import { NewWishlistService } from '../../../../services/common/new-wishlist.service';
import { UserService } from '../../../../services/common/user.service';
import { ViewContentService } from '../../../../services/common/view-content.service';
import { AppConfigService } from '../../../../services/core/app-config.service';
import { GtmService } from '../../../../services/core/gtm.service';
import { ReloadService } from '../../../../services/core/reload.service';
import { UiService } from '../../../../services/core/ui.service';
import { UtilsService } from '../../../../services/core/utils.service';
import { ImageLoadErrorDirective } from '../../../directives/image-load-error.directive';
import { CurrencyCtrPipe } from '../../../pipes/currency.pipe';
import { PricePipe } from '../../../pipes/price.pipe';
import { ProductPricePipe } from '../../../pipes/product-price.pipe';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { StarRatingViewComponent } from '../../star-rating-view/star-rating-view.component';
import { CustomOrderModalComponent } from '../../../dialog/custom-order-modal/custom-order-modal.component';
import { shouldUseDirectCheckout } from '../../../../core/utils/shop-config';

@Component({
  selector: 'app-product-card-2',
  standalone: true,
  imports: [
    RouterLink,
    ProductPricePipe,
    StarRatingViewComponent,
    ImageLoadErrorDirective,
    CurrencyCtrPipe,
    TranslatePipe,
    CustomOrderModalComponent,
  ],
  templateUrl: './product-card-2.component.html',
  styleUrl: './product-card-2.component.scss',
  providers: [PricePipe],
})
export class ProductCard2Component implements OnInit, OnDestroy, OnChanges {
  // Decorator
  @Input() product: Product = null;
// Custom Order Modal
  @Input() isEnableCheckoutOrderModal!: any;
  isCustomOrderModalVisible!: any;

  image: any;
  zoomImage: any;
  prevImage: any;
  private eventId: string;

  /**
   * Usage Guide
   * sizes="(max-width: 599px) 16px, (min-width: 600px) 48px"
   * If with 16px then take the next src near 16w
   */
  protected readonly rawSrcset: string = '640w, 750w';

  // Store Data
  cart: any = null;
  carts: Cart[] = [];
  isModalVisible = false;
  actionType: 'addToCart' | 'buyNow' = 'addToCart';
  // Quantity Control
  qty: number = 1;

  // Variation Manage
  selectedVariation: string = null; // product.variation (e.g., Color)
  selectedVariation2: string = null; // product.variation2 (e.g., Size)
  selectedVariationList: VariationList = null;

  // Internal normalized variant list
  private variants: Array<{
    _id: string;
    name: string;
    v1?: string;
    v2?: string;
    quantity: number;
    image?: string;
    sku?: string;
    regularPrice?: number;
    salePrice?: number;
  }> = [];

  // Inject
  private readonly cartService = inject(CartService);
  private readonly newWishlistService = inject(NewWishlistService);
  private readonly userService = inject(UserService);
  private readonly uiService = inject(UiService);
  private readonly reloadService = inject(ReloadService);
  private readonly router = inject(Router);
  private readonly utilsService = inject(UtilsService);
  private readonly viewContentService = inject(ViewContentService);
  private readonly appConfigService = inject(AppConfigService);
  private readonly gtmService = inject(GtmService);
  private readonly pricePipe = inject(PricePipe);
  private readonly platformId = inject(PLATFORM_ID);

  // Wishlist Signal
  wishlists: Signal<Wishlist[]> = this.newWishlistService.newWishlistItems;

  // Computed Wishlist Item (Find if product exists in wishlist)
  wishlist = computed(() => {
    return this.wishlists().find((f) => {
      const productId =
        typeof f.product === 'string' ? f.product : f.product?._id;
      return productId === this.product?._id;
    });
  });

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // ===== Lifecycle =====
  ngOnInit() {
    // Cart Base
    const subscription = this.cartService.refreshStoredCart$.subscribe(() => {
      this.carts = this.cartService.cartItems;
      this.checkCartList();
    });
    this.subscriptions?.push(subscription);
    this.carts = this.cartService.cartItems;
    this.checkCartList();

    // Set initial quantity based极 on cart if product is already in cart
    if (this.cart) {
      this.qty = this.cart.selectedQty || 1;
    }

    if (this.userService.isUser) {
      // Fetch Wishlist from API
      this.newWishlistService.newGetWishlistByUser();
    }

    // Prepare variations + defaults
    if (this.product?.isVariation) {
      this.normalizeVariants();
      this.setDefaultVariation();
      this.setDefaultImage();
    } else {
      this.setDefaultImage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.product) return;

    if (this.product?.isVariation) {
      this.normalizeVariants();
      this.setDefaultVariation();
      this.setDefaultImage();
    } else {
      this.selectedVariation = null;
      this.selectedVariation2 = null;
      this.selectedVariationList = null;
      this.setDefaultImage();
    }
  }

  // ===== Cart Manage =====
  onAddToCart(event: MouseEvent, type: 'addToCart' | 'buyNow') {
    event.stopPropagation();
    event.preventDefault();
    this.actionType = type;

    // Check if product has custom fields - show custom order modal
    if (this.isEnableCheckoutOrderModal && type === 'buyNow') {
      this.isCustomOrderModalVisible = true;
      // Ensure variations are properly set
      if (this.product?.isVariation) {
        this.normalizeVariants();
        this.setDefaultVariation();
      }
      return;
    }

    // Direct checkout for specific shop IDs
    const shopId = this.appConfigService.getSettingData('shop');
    if (shouldUseDirectCheckout(shopId) && type === 'buyNow') {
      // Ensure variations are set for variation products
      if (this.product?.isVariation) {
        if (!this.isModalVisible) {
          this.normalizeVariants();
          this.setDefaultVariation();
        }
        // If variation is not selected, open modal
        if (!this.selectedVariationList) {
          this.isModalVisible = true;
          return;
        }
      }

      // Guard: prevent add-to-cart when not allowed
      if (!this.canAddToCart) return;

      const getVariationOption = () => {
        if (this.product?.variation && this.product.variation2) {
          return `${this.product?.variation}, ${this.product.variation2}`;
        } else {
          return `${this.product?.variation}`;
        }
      };

      const data: Cart = {
        product: this.product?._id,
        selectedQty: this.qty,
        isSelected: true,
        variation: this.selectedVariationList
          ? {
              _id: this.selectedVariationList?._id,
              name: this.selectedVariationList?.name,
              image: this.selectedVariationList?.image,
              option: getVariationOption(),
              sku: this.selectedVariationList?.sku,
            }
          : null,
      };

      if (this.userService.isUser) {
        // Add to cart and navigate to checkout
        const subscription = this.cartService.addToCart(data).subscribe({
          next: (res) => {
            this.reloadService.needRefreshCart$(true);
            this.isModalVisible = false;
            if (isPlatformBrowser(this.platformId)) {
              this.addToCartEvent();
            }
            this.router.navigate(['/checkout']).then();
          },
          error: (error) => {
            console.log(error);
          },
        });
        this.subscriptions?.push(subscription);
      } else {
        // Add to localStorage and navigate to checkout
        this.cartService.addCartItemToLocalStorage(data);
        this.reloadService.needRefreshCart$(true);
        this.isModalVisible = false;
        if (isPlatformBrowser(this.platformId)) {
          this.addToCartEvent();
        }
        this.router.navigate(['/checkout']).then();
      }
      return;
    }

    // For variation products, open modal first
    if (this.product?.isVariation && !this.isModalVisible) {
      this.isModalVisible = true;
      return;
    }

    // Guard: prevent add-to-cart when not allowed
    if (!this.canAddToCart) return;

    const getVariationOption = () => {
      if (this.product?.variation && this.product.variation2) {
        return `${this.product?.variation}, ${this.product.variation2}`;
      } else {
        return `${this.product?.variation}`;
      }
    };

    const data: Cart = {
      product: this.product?._id,
      selectedQty: this.qty,
      isSelected: true,
      variation: this.selectedVariationList
        ? {
            _id: this.selectedVariationList?._id,
            name: this.selectedVariationList?.name,
            image: this.selectedVariationList?.image,
            option: getVariationOption(),
            sku: this.selectedVariationList?.sku,
          }
        : null,
    };

    if (this.userService.isUser) {
      this.addToCartDB(data, type);
      if (isPlatformBrowser(this.platformId)) {
        this.addToCartEvent();
      }
    } else {
      this.cartService.addCartItemToLocalStorage(data);
      this.reloadService.needRefreshCart$(true);
      this.uiService.actionMessage(
        'Success!',
        'success',
        '/cart',
        '/checkout',
        'local_mall',
        'View Cart',
        'Buy Now'
      );
      this.isModalVisible = false;
      if (isPlatformBrowser(this.platformId)) {
        this.addToCartEvent();
      }
      if (type === 'buyNow') {
        this.router.navigate(['/checkout']).then();
      }
    }
  }

  private addToCartDB(data: Cart, type?: 'addToCart' | 'buyNow') {
    const subscription = this.cartService.addToCart(data).subscribe({
      next: (res) => {
        this.uiService.actionMessage(
          'Success!',
          'success',
          '/cart',
          '/checkout',
          'local_mall',
          'View Cart',
          'Buy Now'
        );
        this.reloadService.needRefreshCart$(true);
        this.isModalVisible = false;
        if (type === 'buyNow') {
          this.router.navigate(['/checkout']);
        }
      },
      error: (error) => {
        console.log(error);
      },
    });
    this.subscriptions?.push(subscription);
  }

  checkCartList() {
    this.cart = this.carts.find((f) => {
      const productId =
        typeof f.product === 'string' ? f.product : f.product?._id;
      const isProductMatch = productId === this.product?._id;

      // Check if variation matches
      const isVariationMatch =
        (!f.variation && !this.selectedVariationList) || // Both have no variation
        (f.variation &&
          this.selectedVariationList &&
          f.variation._id === this.selectedVariationList._id); // Both have matching variation

      return isProductMatch && isVariationMatch;
    });
  }

  // ===== Wishlist Manage =====
  onAddToWishlist(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (this.wishlist()) {
      this.newWishlistService.newDeleteWishlistById(this.wishlist()?._id);
    } else {
      const data: Wishlist | any = {
        product: this.product?._id,
        selectedQty: 1,
      };
      if (this.userService.isUser) {
        this.newWishlistService.newAddToWishlist(data);
      } else {
        this.router.navigate(['/login']).then();
      }
    }
  }

  // ===== Variation Control =====
  /** Normalize product.variationList into an easy structure */
  private normalizeVariants(): void {
    const list = this.product?.variationList || [];
    this.variants = list.map((it: any) => {
      const parts = (it.name || '').split(',').map((s: string) => s.trim());
      return {
        _id: it._id,
        name: it.name,
        v1: parts[0], // first dimension (e.g., color)
        v2: parts[1], // second dimension (e.g., size)
        quantity: it.quantity ?? 0,
        image: it.image,
        sku: it.sku,
        regularPrice: it.regularPrice,
        salePrice: it.salePrice,
      };
    });
  }

  /** First in-stock combo if any */
  private findFirstAvailableCombination(): { v1?: string; v2?: string } | null {
    const hit = this.variants.find((v) => (v.quantity ?? 0) > 0);
    if (!hit) return null;
    return { v1: hit.v1, v2: hit.v2 };
  }

  /** Choose defaults with preference for an in-stock combo */
  private setDefaultVariation() {
    if (!this.product?.isVariation) return;

    const firstOk = this.findFirstAvailableCombination();
    if (firstOk) {
      if (this.product?.variation) this.selectedVariation = firstOk.v1 ?? null;
      if (this.product?.variation2)
        this.selectedVariation2 = firstOk.v2 ?? null;
    } else {
      // Nothing in stock → fallback to first options (won’t be selectable anyway)
      if (this.product?.variation)
        this.selectedVariation = this.product?.variationOptions?.[0] ?? null;
      if (this.product?.variation2)
        this.selectedVariation2 = this.product?.variation2Options?.[0] ?? null;
    }

    this.setSelectedVariationList();

    // If resolved combo is OOS, clear it so price bindings don’t target a bad variant
    if (
      this.selectedVariationList &&
      (this.selectedVariationList.quantity ?? 0) <= 0
    ) {
      this.selectedVariationList = null;
    }
  }

  /** Resolve selectedVariationList from current selections */
  private setSelectedVariationList() {
    if (!this.product?.isVariation) {
      this.selectedVariationList = null;
      return;
    }

    if (this.product?.variation && this.product?.variation2) {
      if (this.selectedVariation && this.selectedVariation2) {
        this.selectedVariationList =
          this.product?.variationList.find(
            (f) =>
              f.name === `${this.selectedVariation}, ${this.selectedVariation2}`
          ) ?? null;
      } else {
        this.selectedVariationList = null;
      }
    } else if (this.product?.variation && !this.product?.variation2) {
      if (this.selectedVariation) {
        this.selectedVariationList =
          this.product?.variationList.find(
            (f) => f.name === `${this.selectedVariation}`
          ) ?? null;
      } else {
        this.selectedVariationList = null;
      }
    } else {
      this.selectedVariationList = null;
    }
  }

  /** Disable first-dimension option when all its combos are OOS */
  isV1Disabled(v1: string): boolean {
    return false;
  }

  /** Disable second-dimension option when all its combos are OOS */
  isV2Disabled(v2: string): boolean {
    return false;
  }

  /** Selection guard for first dimension */
  onSelectVariation(name: string) {
    if (this.isV1Disabled(name)) return;

    if (this.selectedVariation !== name) {
      this.selectedVariation = name;

      // If second already picked but combo invalid, clear it
      if (
        this.product?.variation2 &&
        this.selectedVariation2 &&
        this.isV2Disabled(this.selectedVariation2)
      ) {
        this.selectedVariation2 = null;
      }

      // Color image swap (your logic preserved)
      if (
        this.convertToLowercase(this.product?.variation) === 'color' ||
        this.convertToLowercase(this.product?.variation) === 'colour'
      ) {
        this.prevImage = this.image;
        const vImg = this.product?.variationList.find((v) =>
          v?.name.toLowerCase().includes(name.toLowerCase())
        )?.image;
        this.image = vImg && vImg.length > 0 ? vImg : this.prevImage;
      }

      this.setSelectedVariationList();
      if (this.qty > this.maxQty) this.qty = Math.max(1, this.maxQty);
    }
  }

  /** Selection guard for second dimension */
  onSelectVariation2(name: string) {
    if (this.isV2Disabled(name)) return;

    if (this.selectedVariation2 !== name) {
      this.selectedVariation2 = name;

      // Color image swap for second dimension
      if (
        this.convertToLowercase(this.product?.variation2) === 'color' ||
        this.convertToLowercase(this.product?.variation2) === 'colour'
      ) {
        const vImg = this.product?.variationList.find(
          (v) =>
            v?.name.toLowerCase().includes(name.toLowerCase()) &&
            v?.name
              .toLowerCase()
              .includes(this.selectedVariation?.toLowerCase() || '')
        )?.image;
        this.image = vImg && vImg.length > 0 ? vImg : this.prevImage;
      }

      this.setSelectedVariationList();
      if (this.qty > this.maxQty) this.qty = Math.max(1, this.maxQty);
    }
  }

  /** Can the current selection be added to cart? */
  get canAddToCart(): boolean {
    if (!this.product) return false;
    return this.qty >= 1;
  }

  /** Max qty allowed based on stock */
  get maxQty(): number {
    return 9999;
  }

  incQty(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.maxQty <= 0) return;
    this.qty = Math.min(this.qty + 1, this.maxQty || 1);
  }

  decQty(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.qty = Math.max(1, this.qty - 1);
  }

  onQtyInput(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    let val = Math.floor(Number(input.value || 1));
    if (isNaN(val)) val = 1;
    this.qty = Math.min(Math.max(1, val), this.maxQty || 1);
  }

  // ===== Utils / Modal / Image =====
  convertToLowercase(inputString: string): string {
    return inputString?.toLowerCase()?.trim();
  }

  closeModal() {
    this.isModalVisible = false;
  }

  // ===== Custom Order Modal Methods =====
  onCustomOrderModalClose() {
    this.isCustomOrderModalVisible = false;
  }

  onCustomOrderSubmitted(data: any) {
    console.log('Order submitted:', data);
  }

  getVariationImage(name: string): string | undefined {
    return this.product?.variationList.find((v) =>
      v?.name.toLowerCase().includes(name.toLowerCase())
    )?.image;
  }

  private setDefaultImage() {
    this.image =
      this.product?.images && this.product?.images?.length > 0
        ? this.product?.images[0]
        : 'https://cdn.saleecom.com/upload/images/placeholder.png';
    this.zoomImage = this.image;
  }

  // ===== Tracking =====
  private generateEventId() {
    this.eventId = this.utilsService.generateEventId();
  }

  private addToCartEvent(): void {
    if (!this.product) return;

    // quantity (UI থেকে যদি থাকে)
    const qty = Number(this.qty);
    const unitPrice =
      Number(this.pricePipe.transform(this.product, 'salePrice')) ||
      Number(this.product?.regularPrice) ||
      0;

    if (!unitPrice) return; // price না থাকলে ফায়ার নয়

    // 1️⃣ Generate Unique Event ID
    this.generateEventId();

    // 2️⃣ Hashed User Data
    const user_data = this.utilsService.getUserData({
      email: this.userService.getUserLocalDataByField('email'),
      phoneNo: this.userService.getUserLocalDataByField('phoneNo'),
      external_id: this.userService.getUserLocalDataByField('userId'),
      firstName: this.userService.getUserLocalDataByField('name'),
      city: this.userService.getUserLocalDataByField('division'),
    });

    const contents = [
      {
        id: String(this.product?._id), // ক্যাটালগ SKU হলে SKU দিন
        quantity: qty,
        item_price: unitPrice,
      },
    ];

    // 3️⃣ Prepare custom_data
    const custom_data = {
      contents,
      content_type: 'product',
      content_name: this.product?.name,
      content_category: Array.isArray(this.product?.category) ? this.product.category[0]?.name : (this.product?.category as any)?.name,
      content_subcategory: this.product?.subCategory?.name,
      value: Number(this.pricePipe.transform(this.product, 'salePrice')),
      currency: 'BDT',
      num_items: qty,
    };

    const eventTime = Math.floor(Date.now() / 1000);
    const original_event_data = {
      event_name: 'AddToCart',
      event_time: eventTime,
    };

    // 4️⃣ Server-side Payload
    const trackData: any = {
      event_name: 'AddToCart',
      event_time: eventTime,
      creationTime: eventTime, // Add creationTime field for Conversions API
      event_id: this.eventId,
      action_source: 'website',
      event_source_url: location.href,
      custom_data,
      original_event_data,
      ...(Object.keys(user_data).length > 0 && { user_data }),
    };

    // 5️⃣ Browser: Facebook Pixel Tracking (manual)
    if (
      this.gtmService.facebookPixelId &&
      !this.gtmService.isManageFbPixelByTagManager
    ) {
      this.gtmService.trackByFacebookPixel(
        'AddToCart',
        custom_data,
        this.eventId
      );

      this.gtmService.trackAddToCart(trackData).subscribe({
        next: () => {},
        error: () => {},
      });
    }

    // 6️⃣ Browser: GTM Data Layer Push (GA4 Format)
    if (this.gtmService.tagManagerId) {
      // Calculate total value
      const totalValue = unitPrice * qty;

      // Push GA4 compatible event
      this.gtmService.pushToDataLayer({
        event: 'add_to_cart',
        currency: 'BDT',
        value: totalValue,
        items: [
          {
            item_id: this.product?._id,
            item_name: this.product?.name,
            item_category: Array.isArray(this.product?.category) ? this.product.category[0]?.name : (this.product?.category as any)?.name,
            item_category2: this.product?.subCategory?.name,
            price: unitPrice,
            quantity: qty,
          },
        ],
      });
       // Also push original Facebook Pixel format for compatibility
       this.gtmService.pushToDataLayer({
        event: 'AddToCart',
        event_id: this.eventId,
        page_url: window.location.href,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ecommerce: {
          add: {
            products: [
              {
                id: this.product?._id,
                name: this.product?.name,
                category: Array.isArray(this.product?.category) ? this.product.category[0]?.name : (this.product?.category as any)?.name,
                subcategory: this.product?.subCategory?.name,
                price: this.product?.regularPrice,
                currency: 'BDT',
                quantity: 1,
              },
            ],
            custom_data,
            original_event_data,
            ...(Object.keys(user_data).length > 0 && { user_data }),
          },
        },
      });
    }
  }


  // ===== Calculate =====
  get ratingCount(): number {
    if (this.product) {
      return Math.floor(
        (this.product?.ratingTotal ?? 0) / (this.product?.ratingCount ?? 1)
      );
    } else {
      return 0;
    }
  }

  /** Global stock state:
   * - Non-variation → product.quantity
   * - Variation → ALL variant quantities are 0
   */
  get isOutOfStock(): boolean {
    return false;
  }

  /**
   * Check if cart and buy buttons should be hidden
   * Hide for shop ID: 693a663fd4a8b0311cbe8596
   */
  get shouldHideCartAndBuyButtons(): boolean {
    const shopId = this.appConfigService.getSettingData('shop');
    return shopId === '693a663fd4a8b0311cbe8596';
  }

  // ===== Router link (kept from your pattern) =====
  get productDetailsRouterLink(): any[] {
    const productSetting =
      this.appConfigService.getSettingData('productSetting');
    const slug = this.product?.slug;
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return ['/'];
    }
    if (!productSetting || !productSetting.urlType) {
      return ['/product-details', slug];
    }
    let link;
    switch (productSetting.urlType) {
      case 'website.com/product-details/test-product':
        link = ['/product-details', slug];
        break;
      case 'website.com/products/test-product':
        link = ['/products', slug];
        break;
      case 'website.com/product/test-product':
        link = ['/product', slug];
        break;
      case 'website.com/test-product':
        link = ['/', slug];
        break;
      default:
        link = ['/product-details', slug];
        break;
    }
    return link;
  }

  // ===== Outside click to close modal =====
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const modalContent = document.querySelector(
      '.product-modal'
    ) as HTMLElement;
    if (
      this.isModalVisible &&
      modalContent &&
      !modalContent.contains(event.target as Node)
    ) {
      this.closeModal();
    }
  }

  // ===== On Destroy =====
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
