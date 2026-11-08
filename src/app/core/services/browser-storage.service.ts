import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  read<T>(key: string, fallback: () => T): T {
    if (!this.isBrowser) {
      return fallback();
    }

    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback() : (JSON.parse(value) as T);
    } catch {
      return fallback();
    }
  }

  write<T>(key: string, value: T): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}
