import { environment } from '../../../environments/environment';

export const DATABASE_KEY = Object.freeze({
  encryptUserLogin: 'ROMAN_USER_1_' + environment.VERSION,
  websiteBuildFormData: 'ROMAN_BUILD_INFO' + environment.VERSION,
  userCart: 'ROMAN_CART' + environment.VERSION,
  userWishlist: 'ROMAN_WISHLIST' + environment.VERSION,
  landingPageSetting: 'ROMAN_L_SETTING' + environment.VERSION,
  userInfoForPixel: 'ROMAN_Usr_Info' + environment.VERSION,
});
