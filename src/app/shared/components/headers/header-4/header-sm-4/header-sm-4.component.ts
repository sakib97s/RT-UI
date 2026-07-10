import {Component, HostListener, inject, Input, OnDestroy, OnInit, PLATFORM_ID, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';
import {RouterLink, Router} from "@angular/router";
import {Cart} from '../../../../../interfaces/common/cart.interface';
import {AppConfigService} from "../../../../../services/core/app-config.service";
import {NavigationService} from "../../../../../services/core/navigation.service";
import {SideNavComponent} from "../../header-1/header-sm-1/side-nav/side-nav.component";
import {NgClass} from "@angular/common";
import {UserService} from "../../../../../services/common/user.service";
import {UserDataService} from "../../../../../services/common/user-data.service";
import {User} from "../../../../../interfaces/common/user.interface";
import {isPlatformBrowser} from "@angular/common";
import {Search4Component} from "../header-xl-4/search-4/search-4.component";

@Component({
  selector: 'app-header-sm-4',
  standalone: true,
  imports: [
    RouterLink,
    SideNavComponent,
    NgClass,
    Search4Component
  ],
  templateUrl: './header-sm-4.component.html',
  styleUrl: './header-sm-4.component.scss'
})
export class HeaderSm4Component implements OnInit, OnDestroy {

  // Theme Settings
  searchHints: string[] = [];

  // Decorator
  @Input() currentUrl: string;
  @Input() carts: Cart[] = [];
  @Input() shopInfo: any;
  @Input() categories: any = [];
  @ViewChild('sideNav') sideNav!: SideNavComponent;
  menuOpen = false;

  // Store Data
  protected readonly rawSrcset: string = '384w, 640w';
  isHeaderFixed: boolean = false;
  isHeaderTopHidden: boolean = false;
  isSearchSticky: boolean = false;
  user: User;
  isHydrated: boolean = false;
  private subscriptions: Subscription[] = [];

  // Inject
  private readonly appConfigService = inject(AppConfigService);
  private readonly navigationService = inject(NavigationService);
  private readonly router = inject(Router);
  protected readonly userService = inject(UserService);
  private readonly userDataService = inject(UserDataService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit() {
    // Theme Settings
    this.getSettingData();
    
    // Hydration check
    if (isPlatformBrowser(this.platformId)) {
      this.isHydrated = true;
      if (this.userService.isUser) {
        this.getLoggedInUserData();
      }
    }
  }

  private getLoggedInUserData() {
    const subscription = this.userDataService.getLoggedInUserData('name username phoneNo email').subscribe({
      next: res => {
        this.user = res.data;
      },
      error: err => {
        console.log(err)
      }
    });
    this.subscriptions.push(subscription);
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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

  @HostListener('window:scroll')
  onScroll() {
    this.isHeaderFixed = window.scrollY > 0;
    this.isHeaderTopHidden = window.scrollY > 250;
    this.isSearchSticky = window.scrollY > 100;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.sideNav) {
      this.sideNav.onShowCategory();
    }
  }

  onCategoryClosed() {
    this.menuOpen = false;
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  get isVisible() {
    if(this.currentUrl === '/search') {
      return false;
    }else {
      return true;
    }
  }

  goBack(): void {
    this.navigationService.back();
  }
}
