import { NgOptimizedImage, provideImgixLoader } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors, } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withNoHttpTransferCache, } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideLottieOptions } from 'ngx-lottie';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { authUserInterceptor } from './auth-interceptor/auth-user-interceptor';
import { AppConfigService } from './services/core/app-config.service';
import { AppRoutingModule } from './app-routing.module';
import { FooterComponent } from "./shared/components/core/footer/footer.component";
import { Header1Component } from "./shared/components/headers/header-1/header-1.component";

export function initConfig(configService: AppConfigService) {
  return () => configService.loadConfig();
}

@NgModule({
  declarations: [AppComponent],

  providers: [
    AppConfigService,
    // PwaService, // PWA disabled
    {
      provide: APP_INITIALIZER,
      useFactory: initConfig,
      deps: [AppConfigService],
      multi: true,
    },
    provideClientHydration(withNoHttpTransferCache()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    provideHttpClient(withInterceptors([authUserInterceptor])),
    provideImgixLoader(environment.ftpPrefixPath),
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FooterComponent,
    Header1Component
  ],
})
export class AppModule { }
