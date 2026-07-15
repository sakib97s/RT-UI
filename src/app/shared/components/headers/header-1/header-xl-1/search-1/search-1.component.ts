import { isPlatformBrowser, NgClass } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Product } from '../../../../../../interfaces/common/product.interface';
import { FilterData } from '../../../../../../interfaces/core/filter-data';
import { Pagination } from '../../../../../../interfaces/core/pagination';
import { ProductService } from '../../../../../../services/common/product.service';
import { OutSideClickDirective } from '../../../../../directives/out-side-click.directive';
import { CurrencyCtrPipe } from '../../../../../pipes/currency.pipe';
import { ProductPricePipe } from '../../../../../pipes/product-price.pipe';
import { AppConfigService } from '../../../../../../services/core/app-config.service';

@Component({
    selector: 'app-search-1',
    templateUrl: './search-1.component.html',
    styleUrl: './search-1.component.scss',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        NgClass,
        OutSideClickDirective,
        ProductPricePipe,
        CurrencyCtrPipe,
    ]
})
export class Search1Component implements OnInit, AfterViewInit, OnDestroy {
  // Decorator
  @ViewChild('searchForm') searchForm: NgForm;
  @ViewChild('searchInput') searchInput: ElementRef;

  // Store Data
  searchProducts: Product[] = [];
  searchQuery = null;

  // Search View Control
  overlay = false;
  isOpen = false;
  isFocused = false;
  isLoading = false;

  // ============================================
  // PLACEHOLDER MODE SELECTION
  // ============================================
  // To switch placeholder modes, change the value below:
  // 
  // OPTION 1: Search Hints (animated rotating hints) - CURRENTLY ACTIVE
  // - Keep: useSearchHints = true;  (uses search hints)
  // - Change to: useSearchHints = false;  (uses static text placeholder)
  
  // OPTION 2: Static Text Placeholder (txt = 'Search products...')
  // - Automatically used when useSearchHints = false
  // - Shows animated typing effect with "Search products..."
  // ============================================
  
  useSearchHints = true; // Change to false to use static text placeholder

  // Theme Settings - Search Hints
  searchHints: string[] = [];

  // Placeholder Animation (for static text mode)
  timeOutOngoing: any;
  char = 0;
  txt = 'Search products...';

  // Subscriptions
  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  // Inject
  private readonly platformId = inject(PLATFORM_ID);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly appConfigService = inject(AppConfigService);

  ngOnInit(): void {
    // Theme Settings - Get Search Hints (initialize before view renders)
    this.getSettingData();
  }

  ngAfterViewInit(): void {
    // Initialize placeholder based on selected mode
    // If search hints are disabled, use static text placeholder
    if (!this.useSearchHints && isPlatformBrowser(this.platformId)) {
      this.searchAnim();
    }
    const subscription = this.searchForm?.valueChanges
      .pipe(
        map((t: any) => t['searchTerm']),
        filter(() => this.searchForm.valid),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((data) => {
          this.searchQuery = data?.trim();
          if (this.searchQuery === '' || this.searchQuery === null) {
            this.overlay = false;
            this.searchProducts = [];
            this.searchQuery = null;
            return EMPTY;
          }
          this.isLoading = true;
          const pagination: Pagination = {
            pageSize: 12,
            currentPage: 0,
          };
          // Select
          const mSelect = {
            name: 1,
            slug: 1,
            images: 1,
            category: 1,
            variationList: 1,
            regularPrice: 1,
            salePrice: 1,
            isVariation: 1,
            minimumWholesaleQuantity: 1,
            wholesalePrice: 1,
          };

          const filterData: FilterData = {
            pagination: pagination,
            filter: { status: 'publish' },
            select: mSelect,
            sort: { createdAt: -1 },
          };
          return this.productService.getAllProducts(
            filterData,
            this.searchQuery
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.searchProducts = res.data.sort(
            (a, b) =>
              a.name.toLowerCase().indexOf(this.searchQuery.toLowerCase()) -
              b.name.toLowerCase().indexOf(this.searchQuery.toLowerCase())
          );
          if (this.searchProducts.length > 0) {
            this.isOpen = true;
            this.overlay = true;
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.log(err);
        },
      });

    this.subscriptions?.push(subscription);
  }

  /**
   * Search Area Control
   * handleBlur()
   * onSearchNavigate()
   * handleFocus()
   * setPanelState()
   * handleOpen()
   * handleCloseAndClear()
   * onSelectItem()
   */

  handleBlur() {
    // Reset focus state to show placeholder again when input is blurred
    setTimeout(() => {
      this.isFocused = false;
    }, 200); // Small delay to allow click events to complete
    
    // Restart animation if using static text mode
    if (!this.useSearchHints && isPlatformBrowser(this.platformId)) {
      this.searchAnim();
      this.char = 0;
    }
  }

  onInputChange() {
    // Trigger change detection when input value changes
    // This ensures hints visibility updates correctly
  }

  onSearchNavigate() {
    let inputVal = (this.searchInput.nativeElement as HTMLInputElement).value;
    if (inputVal) {
      this.router
        .navigate(['/', 'products'], {
          queryParams: { searchQuery: inputVal },
          queryParamsHandling: '',
        })
        .then();
      this.searchInput.nativeElement.value = '';
      this.isOpen = false;
    }
  }

  handleFocus(event: FocusEvent): void {
    this.searchInput.nativeElement.focus();
    if (this.isFocused) {
      return;
    }
    if (this.searchProducts.length > 0) {
      this.setPanelState(event);
    }
    this.isFocused = true;
    let target = this.searchInput.nativeElement as HTMLInputElement;
    target.placeholder = '';
    // Clear animation timeout if using static text mode
    if (!this.useSearchHints) {
      clearTimeout(this.timeOutOngoing);
    }
  }

  private setPanelState(event: FocusEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = false;
    this.handleOpen();
  }

  handleOpen(): void {
    if (this.isOpen || (this.isOpen && !this.isLoading)) {
      return;
    }
    if (this.searchProducts.length > 0) {
      this.isOpen = true;
      this.overlay = true;
    }
  }

  handleOutsideClick(): void {
    this.searchInput.nativeElement.value = '';
    if (!this.isOpen) {
      // this.isFocused = false;
      return;
    }
    this.isOpen = false;
    this.overlay = false;
    this.isFocused = false;
    this.searchProducts = [];
  }

  handleCloseAndClear(): void {
    if (!this.isOpen) {
      this.isFocused = false;
      return;
    }
    this.isOpen = false;
    this.overlay = false;
    this.searchProducts = [];
    this.isFocused = false;
  }

  onSelectItem(data: Product): void {
    this.searchInput.nativeElement.value = '';
    this.handleCloseAndClear();
    this.router.navigate(['/', 'product-details', data?.slug]).then();
  }

  /**
   * Initial Landing Page Setting
   * getSettingData()
   */
  private getSettingData() {
    const searchHintsSetting = this.appConfigService.getSettingData('searchHints');
    const baseResults = searchHintsSetting.split(',').map((item: string) => item.trim());
    this.searchHints = [...baseResults, baseResults[0]];
  }

  /**
   * Check if search input is empty
   */
  get isInputEmpty(): boolean {
    if (!this.searchInput?.nativeElement) {
      return true;
    }
    const value = (this.searchInput.nativeElement as HTMLInputElement).value;
    return !value || value.trim() === '';
  }

  /**
   * Search Input Animation (for static text mode)
   * searchAnim()
   * typeIt()
   */
  private searchAnim() {
    const target = this.searchInput?.nativeElement as HTMLInputElement;
    if (!target) return;
    target.placeholder = '|'; // Reset the placeholder to "|"
    this.char = 0; // Reset the character count to 0
    this.typeIt(target, 250); // Call the typing animation with a fixed delay (250ms)
  }

  private typeIt(target: HTMLInputElement, delay: number) {
    // Clear any previous timeouts to avoid overlapping animations
    clearTimeout(this.timeOutOngoing);

    this.timeOutOngoing = setTimeout(() => {
      // Increment the character count
      this.char++;

      // Get the substring based on the current character count
      const type = this.txt.substring(0, this.char);
      target.placeholder = type + '|'; // Update the placeholder with the typed text

      // If the entire text is typed, reset and start over
      if (this.char < this.txt.length) {
        this.typeIt(target, delay); // Continue typing
      } else {
        // Once the text is fully typed, reset to "|" and start over
        target.placeholder = '|';
        this.char = 0; // Reset the character count
        this.typeIt(target, delay); // Restart the typing animation
      }
    }, delay); // Use a constant delay to ensure consistent speed
  }

  /**
   * On Destroy
   */
  ngOnDestroy(): void {
    // Clear any ongoing animations
    if (this.timeOutOngoing) {
      clearTimeout(this.timeOutOngoing);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
