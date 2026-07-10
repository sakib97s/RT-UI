import {Pipe, PipeTransform} from '@angular/core';
import {LanguageService} from '../../services/core/language.service';


@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
// export class TranslatePipe implements PipeTransform {
//   constructor(private languageService: LanguageService) {
//   }
//
//   transform(value: string): string {
//     return this.languageService.translate(value);
//   }
// }

export class TranslatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(key: string, params?: { [key: string]: any }): string {
    let translated = this.languageService.translate(key);

    // যদি params পাঠানো থাকে তাহলে replace করবো
    if (params) {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        translated = translated.replace(regex, params[paramKey]);
      });
    }

    return translated;
  }
}
