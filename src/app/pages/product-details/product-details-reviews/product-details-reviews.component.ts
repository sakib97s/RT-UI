import {
  Component,
  EventEmitter,
  inject, Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Product } from '../../../interfaces/common/product.interface';
import { Review } from '../../../interfaces/common/review.interface';
import { FilterData } from '../../../interfaces/core/filter-data';
import { Pagination } from '../../../interfaces/core/pagination';
import { ProductService } from '../../../services/common/product.service';
import { ReviewService } from '../../../services/common/review.service';
import { ProductRatingCardComponent } from '../../../shared/components/product-rating-card/product-rating-card.component';
import { StarRatingViewComponent } from '../../../shared/components/star-rating-view/star-rating-view.component';

@Component({
  selector: 'app-product-details-reviews',
  templateUrl: './product-details-reviews.component.html',
  styleUrl: './product-details-reviews.component.scss',
  standalone: true,
  imports: [StarRatingViewComponent, ProductRatingCardComponent, RouterLink],
})
export class ProductDetailsReviewsComponent implements OnInit, OnDestroy {
  // Decorator
  @Input() product: Product
  @Input() maxReviews?: number; // Optional: limit number of reviews to display
  @Input() showViewAllButton: boolean = false; // Show View All button
  @Input() hideRatingSummary: boolean = false; // Hide rating summary section
  @Output() viewAllClicked = new EventEmitter<void>(); // Emit when View All is clicked

  // Store Data
  slug?: string;
  // Store Data
  allReviews: Review[] = [];
  totalReviews: number = 0;
  @Output() reviewsCountChange = new EventEmitter<number>();

  // Inject
  private readonly reviewService = inject(ReviewService);
  private readonly activateRoute = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  // Subscriptions
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Param Map
    const subscription = this.activateRoute.paramMap.subscribe((param) => {
      this.slug = param.get('slug');
      if (this.slug) {
        this.getProductBySlug();
      }
    });
    this.subscriptions?.push(subscription);
    // Base Data
  }

  /**
   * HTTP Request Handle
   * getProductBySlug()
   * getRelatedProducts()
   * getAllCategory()
   * getAllBanners()
   */
  private getProductBySlug() {
    const subscription = this.productService
      .getProductBySlug(this.slug)
      .subscribe({
        next: (res) => {
          this.product = res.data;
          if (this.product) {
            this.getAllReviews();
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  /**
   * HTTP Req Handle
   * getAllReviews()
   */

  private getAllReviews() {
    const pagination: Pagination = {
      pageSize: this.maxReviews || 5, // Use maxReviews if provided, otherwise default to 5
      currentPage: 0,
    };

    // Select
    const mSelect = {
      name: 1,
      user: 1,
      product: 1,
      review: 1,
      images: 1,
      rating: 1,
      status: 1,
      reviewDate: 1,
      reply: 1,
      replyDate: 1,
    };

    const filterData: FilterData = {
      pagination: pagination,
      filter: { 'product._id': this.product?._id, status: true },
      select: mSelect,
      sort: { createdAt: -1 },
    };

    const subscription = this.reviewService
      .getAllReviewsByProductId(filterData, null)
      .subscribe({
        next: (res) => {
          this.allReviews = res.data;
          this.totalReviews = res?.count;
          this.reviewsCountChange.emit(this.totalReviews || 0);
        },
        error: (err) => {
          console.log(err);
        },
      });
    this.subscriptions?.push(subscription);
  }

  /**
   * Calculate
   * displayRating()
   * getRatingPercentage()
   */
  get displayRating(): number {
    if (!this.product) {
      return 0;
    }

    // Prefer backend-provided average if available
    const ratingAvr = (this.product as any).ratingAvr as number | undefined;
    if (typeof ratingAvr === 'number' && ratingAvr > 0) {
      return Math.round(ratingAvr);
    }

    // Fallback: compute from totals if available
    const total = this.product.ratingTotal ?? 0;
    const count = this.product.ratingCount ?? 0;
    if (count > 0 && total > 0) {
      return Math.round(total / count);
    }

    // Fallback: compute weighted average from ratingDetails
    const d = this.product.ratingDetails;
    if (d) {
      const counts = [
        d.oneStar ?? 0,
        d.twoStar ?? 0,
        d.threeStar ?? 0,
        d.fourStar ?? 0,
        d.fiveStar ?? 0,
      ];
      const totalCount = counts.reduce((acc, n) => acc + (n || 0), 0);
      if (totalCount > 0) {
        const weightedSum =
          1 * counts[0] +
          2 * counts[1] +
          3 * counts[2] +
          4 * counts[3] +
          5 * counts[4];
        return Math.round(weightedSum / totalCount);
      }
    }

    // Last resort: compute average from loaded reviews
    if (this.allReviews?.length) {
      const sum = this.allReviews.reduce(
        (acc, r) => acc + (Number(r.rating) || 0),
        0
      );
      return Math.round(sum / this.allReviews.length);
    }

    return 0;
  }

  private get totalRatingsCount(): number {
    if (!this.product) {
      return this.allReviews.length || 0;
    }
    if (
      typeof this.product.ratingCount === 'number' &&
      this.product.ratingCount > 0
    ) {
      return this.product.ratingCount;
    }
    const b = this.ratingBreakdown;
    const sum = b.oneStar + b.twoStar + b.threeStar + b.fourStar + b.fiveStar;
    if (sum > 0) {
      return sum;
    }
    return (this.product.reviewTotal ?? 0) || this.allReviews.length || 0;
  }

  getRatingPercentage(starCount: number): number {
    const total = this.totalRatingsCount;
    if (starCount && total > 0) {
      return Math.floor((starCount / total) * 100);
    }
    return 0;
  }

  get ratingBreakdown(): {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  } {
    const details = this.product?.ratingDetails;
    if (details) {
      const fromDetails = {
        oneStar: details.oneStar ?? 0,
        twoStar: details.twoStar ?? 0,
        threeStar: details.threeStar ?? 0,
        fourStar: details.fourStar ?? 0,
        fiveStar: details.fiveStar ?? 0,
      };
      const detailsSum =
        fromDetails.oneStar +
        fromDetails.twoStar +
        fromDetails.threeStar +
        fromDetails.fourStar +
        fromDetails.fiveStar;
      if (detailsSum > 0) {
        return fromDetails;
      }
      // else, fall through to compute from reviews
    }

    // Fallback: calculate from loaded reviews
    const initial = {
      oneStar: 0,
      twoStar: 0,
      threeStar: 0,
      fourStar: 0,
      fiveStar: 0,
    };
    if (!this.allReviews?.length) {
      return initial;
    }
    return this.allReviews.reduce((acc, r) => {
      const rating = Math.max(1, Math.min(5, Number(r.rating) || 0));
      if (rating === 1) acc.oneStar += 1;
      else if (rating === 2) acc.twoStar += 1;
      else if (rating === 3) acc.threeStar += 1;
      else if (rating === 4) acc.fourStar += 1;
      else if (rating === 5) acc.fiveStar += 1;
      return acc;
    }, initial);
  }

  /**
   * Handle View All Click
   */
  onViewAllClick() {
    this.viewAllClicked.emit();
  }

  /**
   * Check if should show View All button
   */
  get shouldShowViewAll(): boolean {
    return this.showViewAllButton && this.totalReviews > (this.maxReviews || 5);
  }

  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }
}
