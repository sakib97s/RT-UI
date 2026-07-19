import {Component, ElementRef, HostListener, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild} from '@angular/core';
import {RouterLink} from "@angular/router";
import {Banner} from "../../../../interfaces/common/banner.interface";
import {BannerService} from "../../../../services/common/banner.service";
import {Subscription} from "rxjs";
import {FilterData} from "../../../../interfaces/core/filter-data";
import {isPlatformBrowser, isPlatformServer} from "@angular/common";
import {BannerLoaderOneComponent} from "../../../../shared/loader/banner-loader-one/banner-loader-one.component";
import {SafeUrlPipe} from "../../../../shared/pipes/safe-url.pipe";

@Component({
    selector: 'app-banner-1',
    imports: [
        RouterLink,
        BannerLoaderOneComponent,
        SafeUrlPipe
    ],
    templateUrl: './banner-1.component.html',
    styleUrl: './banner-1.component.scss'
})
export class Banner1Component implements OnInit, OnDestroy {

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('iframeElement') iframeElement!: ElementRef<HTMLIFrameElement>;

  // Store Data
  banners: any[] = []; // Changed to any[] to support 'title' property from backend
  isLoading: boolean = true;
  isPlaying: boolean = true;
  isMobile: number;
  isBrowser: boolean;
  isServer: boolean;

  // Inject
  private readonly bannerService = inject(BannerService);
  private readonly platformId = inject(PLATFORM_ID);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);
    this.isMobile = this.isBrowser ? window.innerWidth : 1920;
  }

  ngOnInit() {
    this.getAllBanner();
  }

  private getAllBanner(): void {
    const filterData: FilterData = {
      filter: {
        status: 'publish',
        type: { $in: ['Home Page Top Banner', 'banner-one'] }
      },
      pagination: null,
      select: {
        title: 1,
        name: 1,
        type: 1,
        images: 1,
        videoUrl: 1,
        showHome: 1,
      },
      sort: {priority: -1}
    };

    const subscription = this.bannerService.getAllBanner(filterData, null).subscribe({
      next: res => {
        this.banners = res.data;
        this.isLoading = false;
      },
      error: err => {
        console.error(err);
        this.isLoading = false;
      }
    });
    this.subscriptions?.push(subscription);
  }

  getFormattedVideoUrl(url: string): string {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}autoplay=1&mute=1&enablejsapi=1&loop=1`;
    }
    return url;
  }

  togglePlayPause(): void {
    if (this.videoElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      if (this.isPlaying) {
        video.pause();
        this.isPlaying = false;
      } else {
        video.play();
        this.isPlaying = true;
      }
    } else if (this.iframeElement?.nativeElement) {
      const iframe = this.iframeElement.nativeElement;
      const action = this.isPlaying ? 'pauseVideo' : 'playVideo';
      iframe.contentWindow?.postMessage(`{"event":"command","func":"${action}","args":""}`, '*');
      this.isPlaying = !this.isPlaying;
    }
  }

  @HostListener('window:resize')
  onGetInnerWidth(): void {
    this.isMobile = window.innerWidth;
  }

  ngOnDestroy() {
    this.subscriptions?.forEach(sub => sub?.unsubscribe());
  }
}
