import { Component, HostListener, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ShopInformation } from "../../../../../interfaces/common/shop-information.interface";
import { NgClass } from "@angular/common";
import { SideNavComponent } from "./side-nav/side-nav.component";
import { Category } from "../../../../../interfaces/common/category.interface";
import { Subscription } from "rxjs";

@Component({
    selector: 'app-bottom-navbar-5',
    imports: [
        RouterLink,
        RouterLinkActive,
        NgClass,
        SideNavComponent
    ],
    templateUrl: './bottom-navbar-5.component.html',
    styleUrl: './bottom-navbar-5.component.scss'
})
export class BottomNavbar5Component implements OnInit, OnDestroy {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  @ViewChild('sideNav') sideNav!: SideNavComponent;

  // Decorator
  @Input() currentUrl: string;
  @Input() shopInfo: ShopInformation;
  @Input() chatLink: any;
  // Store Data
  chatStyle: boolean = false;
  categories: Category[] = [];
  isLoading: boolean = true;

  // Subscription
  private subscriptions: Subscription[] = [];

  /**
   * Other Methods
   * isVisible
   * getSocialLink()
   * onClick()
   * chatOpen()
   **/
  get isVisible() {
    return (
      !['/cart', '/checkout', '/easy-checkout'].includes(this.currentUrl) &&
      !this.currentUrl.startsWith('/product-details/')
    );
  }


  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.chat')) {
      this.chatStyle = false;
    }
  }

  chatOpen() {
    this.chatStyle = !this.chatStyle;
  }

  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    document.body.style.overflow = this.isSidebarOpen ? 'hidden' : 'auto';
  }

  menuOpen = false;
  toggleMenu() {
    console.log("menuOpen", menubar);
    this.menuOpen = !this.menuOpen;
    this.sideNav?.onShowCategory();
  }

  onCategoryClosed() {
    this.menuOpen = false;
  }

  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.subscriptions?.forEach(sub => sub?.unsubscribe());
  }

}
