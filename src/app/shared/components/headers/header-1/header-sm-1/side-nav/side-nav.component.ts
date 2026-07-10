import { NgForOf, NgIf, NgOptimizedImage } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImgCtrlPipe } from '../../../../../pipes/img-ctrl.pipe';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
  imports: [RouterLink, NgForOf, NgIf, MatIcon, NgOptimizedImage, ImgCtrlPipe],
  standalone: true,
})
export class SideNavComponent implements OnDestroy {
  @Input() shopInfo: any;
  @Input() categoryMenus: any;

  @Output() categoryClosed = new EventEmitter<void>();

  categorySlide = false;
  toggleSub: string | null = null;
  toggleChild: string | null = null;
  categories: any[] = [];
  subcategoryMap: { [categoryId: string]: any[] } = {};
  childCategoryMap: { [subCategoryId: string]: any[] } = {};
  private subscriptions: Subscription[] = [];
  placeholderImg: string = `https://cdn.saleecom.com/upload/static/placeholder.png`;

  // Inject
  private readonly router = inject(Router);

  onShowCategory() {
    this.categorySlide = true;
    if (!this.categories?.length) {
      this.getAllCategories();
    }
  }

  onHideCategory() {
    this.categorySlide = false;
    this.toggleSub = null;
    this.toggleChild = null;
    this.categoryClosed.emit();
  }

  showSub(id: string) {
    this.toggleSub = this.toggleSub === id ? null : id;
    this.toggleChild = null; // Reset child toggle
  }

  showChild(id: string) {
    this.toggleChild = this.toggleChild === id ? null : id;
  }

  trackById(index: number, item: any) {
    return item?._id || index;
  }

  ngOnDestroy(): void {
    this.subscriptions?.forEach((sub) => sub?.unsubscribe());
  }

  private getAllCategories() {
    const filterData: any = {
      pagination: null,
      filter: { status: 'publish' },
      select: { name: 1, images: 1, slug: 1, priority: 1 },
      sort: { priority: -1 },
    };
    this.categories = this.categoryMenus;
  }

  onCategoryClick(category: any) {
    const categoryId = category?._id;
    const categorySlug = category?.slug;
    if (!categoryId) return;
    if (this.toggleSub === categoryId) {
      this.toggleSub = null;
      this.toggleChild = null;
      return;
    }
    if (this.subcategoryMap[categoryId] !== undefined) {
      const list = this.subcategoryMap[categoryId];
      if (!list.length) {
        this.router.navigate(['/products'], {
          queryParams: { categories: categorySlug },
          queryParamsHandling: 'merge',
        });
        this.onHideCategory();
        return;
      }
      this.toggleSub = categoryId;
      this.toggleChild = null;
      return;
    }
  }

  onSubCategoryClick(category: any, subCategory: any) {
    const categoryId = category?._id;
    const categorySlug = category?.slug;
    const subId = subCategory?._id;
    const subSlug = subCategory?.slug;
    if (!categoryId || !subId) return;
    const toggleKey = `${categoryId}_${subId}`;
    if (this.toggleChild === toggleKey) {
      this.toggleChild = null;
      return;
    }
    if (this.childCategoryMap[subId] !== undefined) {
      const list = this.childCategoryMap[subId];
      if (!list.length) {
        this.router.navigate(['/products'], {
          queryParams: { categories: categorySlug, subCategories: subSlug },
          queryParamsHandling: 'merge',
        });
        this.onHideCategory();
        return;
      }
      this.toggleChild = toggleKey;
      return;
    }
  }
}
