import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Carousel } from '../../../../interfaces/common/carousel.interface';
import { Category } from '../../../../interfaces/common/category.interface';
import { FilterData } from '../../../../interfaces/core/filter-data';
import { CarouselService } from '../../../../services/common/carousel.service';
import { ImageSliderComponent } from '../../../../shared/components/image-slider/image-slider.component';
import { CarouselComponent } from '../../../../shared/loader/carousel-loader/carousel-loader.component';
import { ShowcaseThreeCategoryLoaderComponent } from '../../../../shared/loader/showcase-three-category-loader/showcase-three-category-loader.component';
import { ArrayToSingleImagePipe } from '../../../../shared/pipes/array-to-single-image.pipe';
import { ImgCtrlPipe } from '../../../../shared/pipes/img-ctrl.pipe';

interface Campaign {
  title: string;
  logoUrl: string;
  startDateTime: Date;
  dd?: number;
  hh?: number;
  mm?: number;
  ss?: number;
}

@Component({
    selector: 'app-showcase-5',
    imports: [
        CarouselComponent,
        ImageSliderComponent,
        ShowcaseThreeCategoryLoaderComponent,
        ArrayToSingleImagePipe,
        ImgCtrlPipe,
        NgOptimizedImage,
    ],
    templateUrl: './showcase-5.component.html',
    styleUrl: './showcase-5.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Showcase5Component implements OnInit, OnDestroy {
  upcomingCampaigns: any[] = [];
  campaigns: any[] = [];
  // Store Data
  carousels: Carousel[] = [];
  categories: Category[] = [];
  isLoading: boolean = true;
  protected readonly rawSrcset: string = '640w, 750w';
  // Inject
  private readonly carouselService = inject(CarouselService);
//  private readonly categoryService = inject(CategoryService);
//  private readonly promoOfferService = inject(PromoOfferService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Timer for countdown
  private countdownTimer: any;

  ngOnInit() {
    // Base Data
    this.getAllCarousel();
//    this.getAllCategory();
//    this.loadCampaigns();

    // Start timer after component initialization if in browser
    if (isPlatformBrowser(this.platformId)) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.startCountdownTimer();
      }, 100);
    }
  }

  /**
   * HTTP Request Handle
   * getAllCarousel()
   * getAllCategory()
   */
  private getAllCarousel(): void {
    const subscription = this.carouselService.getAllCarousel().subscribe({
      next: (res) => {
        this.carousels = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      },
    });
    this.subscriptions?.push(subscription);
  }

/*
  private getAllCategory() {
    const filterData: FilterData = {
      pagination: null,
      filter: { status: 'publish' },
      select: { name: 1, images: 1, slug: 1, priority: 1 },
      sort: { priority: -1 }, // Initial sort by name, will be re-sorted after fetching
    };

    const subscription = this.categoryService
      .subscribe({
        next: (res) => {
          this.categories = res.data;
          this.isLoading = false;
        },
        error: (err) => {
          console.log(err);
          this.isLoading = false;
        },
      });
    this.subscriptions?.push(subscription);
  }

  loadCampaigns() {
    this.promoOfferService.getUpcoming().subscribe((res) => {
      // console.log('data', res.data);
      this.upcomingCampaigns = res?.data;
      this.updateCountdown();

      // Only start timer in browser environment
      if (isPlatformBrowser(this.platformId)) {
        this.startCountdownTimer();
      }
    });
  }
*/

  updateCountdown() {
    const now = new Date().getTime();

    // Update countdown values in place to avoid re-rendering images
    this.upcomingCampaigns.forEach((c) => {
      const diff = new Date(c.startDateTime).getTime() - now;

      // If countdown has ended, show zeros
      if (diff <= 0) {
        c.dd = 0;
        c.hh = 0;
        c.mm = 0;
        c.ss = 0;
      } else {
        c.dd = Math.floor(diff / (1000 * 60 * 60 * 24));
        c.hh = Math.floor((diff / (1000 * 60 * 60)) % 24);
        c.mm = Math.floor((diff / (1000 * 60)) % 60);
        c.ss = Math.floor((diff / 1000) % 60);
      }
    });

    // Manually trigger change detection for countdown values only
    this.cdr.markForCheck();
  }

  startCountdownTimer() {
    // Only start timer in browser environment (not during SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Clear existing timer if any
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    // Start new timer that updates every second
    this.countdownTimer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  stopCountdownTimer() {
    // Only clear timer in browser environment
    if (isPlatformBrowser(this.platformId) && this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  // TrackBy function to prevent unnecessary re-renders
  trackByCampaign(index: number, campaign: any): any {
    return campaign.title || index;
  }

  /**
   * ON Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
    this.stopCountdownTimer();
  }
}
