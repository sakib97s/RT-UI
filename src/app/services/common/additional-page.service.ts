import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AdditionalPage } from '../../interfaces/common/additional-page.interface';
import { FilterData } from '../../interfaces/core/filter-data';

const API_URL = environment.apiBaseLink + '/api/additional-page/';

@Injectable({
  providedIn: 'root',
})
export class AdditionalPageService {
  // Inject
  private httpClient = inject(HttpClient);

  /**
   * getAdditionalPageBySlug
   */

  getAdditionalPageBySlug(slug: string, select?: string) {
    let params = new HttpParams();
    if (select) {
      params = params.append('select', select);
    }
    return this.httpClient.get<{
      data: AdditionalPage;
      message: string;
      success: boolean;
    }>(API_URL + 'get-by-slug/' + slug, { params });
  }

  /**
   * getAllAdditionalPages
   */

  getAllAdditionalPages(select?: string, endpoint: string = 'get-all-data') {
    let params = new HttpParams();
    if (select) {
      params = params.append('select', select);
    }
    return this.httpClient.get<{
      data: AdditionalPage[];
      message: string;
      success: boolean;
    }>(API_URL + endpoint, { params });
  }

  /**
   * getAllAdditionalPagesByShop - POST method with filter data
   */

  getAllAdditionalPagesByShop(
    shop: string,
    filterData?: FilterData,
    searchQuery?: string
  ) {
    let params = new HttpParams();
    if (shop) {
      params = params.append('shop', shop);
    }
    if (searchQuery) {
      params = params.append('q', searchQuery);
    }

    // Ensure filter is a non-empty object (backend validation requirement)
    const requestBody: FilterData = filterData || {};
    if (!requestBody.filter || Object.keys(requestBody.filter).length === 0) {
      requestBody.filter = {}; // Backend will add shop filter automatically
    }

    return this.httpClient.post<{
      data: AdditionalPage[];
      count: number;
      success: boolean;
      message: string;
    }>(API_URL + 'get-all-by-shop', requestBody, { params });
  }
}
