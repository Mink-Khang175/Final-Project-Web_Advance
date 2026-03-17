import { Component, Input, Output, EventEmitter, Inject, PLATFORM_ID, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  imageHover?: string;
  images?: string[];    // mảng nhiều ảnh
  sale?: number;
  salePercent?: number;
  soldOut?: boolean;
  category?: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard implements OnChanges, OnInit, OnDestroy {
  @Input() product!: Product;
  @Input() detailUrl: string = '';
  @Output() buyNow = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();
  isWishlisted = false;
  isWishlistBusy = false;
  private readonly wishlistSyncHandler = () => this.syncWishlistState();

  constructor(
    private router: Router,
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.syncWishlistState();
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('wishlist:sync', this.wishlistSyncHandler);
    this.syncWishlistState();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('wishlist:sync', this.wishlistSyncHandler);
  }

  onBuyNow(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.buyNow.emit(this.product);
  }

  onAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.addToCart.emit(this.product);
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId) || this.isWishlistBusy) return;

    const userId = this.getLoggedInUserId();
    if (!userId) {
      this.router.navigate(['/auth']);
      return;
    }

    if (!userId || !this.product?.id) return;

    this.isWishlistBusy = true;
    const nextState = !this.isWishlisted;
    this.isWishlisted = nextState;
    this.writeWishlistCache(userId, nextState);

    if (!nextState) {
      this.api.removeFromWishlist(userId, this.product.id).subscribe({
        next: () => {
          this.dispatchWishlistSync();
          this.isWishlistBusy = false;
        },
        error: () => {
          this.isWishlisted = true;
          this.writeWishlistCache(userId, true);
          this.dispatchWishlistSync();
          this.isWishlistBusy = false;
        }
      });
      return;
    }

    this.api.addToWishlist({
      userId,
      productId: this.product.id,
      productName: this.product.name,
      image: this.resolveImg(this.product.images?.[0]) || this.product.image,
      price: this.displayPrice,
      category: this.product.category
    }).subscribe({
      next: () => {
        this.dispatchWishlistSync();
        this.isWishlistBusy = false;
      },
      error: () => {
        this.isWishlisted = false;
        this.writeWishlistCache(userId, false);
        this.dispatchWishlistSync();
        this.isWishlistBusy = false;
      }
    });
  }

  navigateToDetail(): void {
    if (!this.detailUrl) return;
    // Parse path + queryParams from detailUrl e.g. /product-detail?id=abc
    const [path, query] = this.detailUrl.split('?');
    const queryParams: Record<string, string> = {};
    if (query) {
      query.split('&').forEach(p => {
        const [k, v] = p.split('=');
        queryParams[k] = decodeURIComponent(v);
      });
    }
    this.router.navigate([path], { queryParams });
  }

  get displayPrice(): number {
    return this.product.sale || this.product.price;
  }

  get hasDiscount(): boolean {
    return !!this.product.sale && this.product.sale < this.product.price;
  }

  resolveImg(path: string | undefined): string {
    if (!path) return '';
    return path.startsWith('/assets/') ? path : '/assets/' + path;
  }

  private syncWishlistState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const userId = this.getLoggedInUserId();
    if (!userId) {
      this.isWishlisted = false;
      return;
    }
    const ids = this.getWishlistCache(userId);
    this.isWishlisted = !!this.product?.id && ids.includes(this.product.id);
  }

  private writeWishlistCache(userId: string, isAdd: boolean): void {
    if (!isPlatformBrowser(this.platformId) || !this.product?.id) return;
    const ids = this.getWishlistCache(userId);
    const has = ids.includes(this.product.id);
    let next = ids;
    if (isAdd && !has) next = [...ids, this.product.id];
    if (!isAdd && has) next = ids.filter(id => id !== this.product.id);
    localStorage.setItem(this.getWishlistCacheKey(userId), JSON.stringify(next));
  }

  private getWishlistCache(userId: string): string[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const key = this.getWishlistCacheKey(userId);
    const raw = localStorage.getItem(key);
    // Backward compatibility for old shared key.
    const fallbackRaw = !raw ? localStorage.getItem('wishlistProductIds') : null;
    const source = raw || fallbackRaw;
    if (!source) return [];
    try {
      const ids = JSON.parse(source);
      if (fallbackRaw && Array.isArray(ids)) {
        localStorage.setItem(key, JSON.stringify(ids));
        localStorage.removeItem('wishlistProductIds');
      }
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }

  private getLoggedInUserId(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    const raw = localStorage.getItem('loggedInUser');
    if (!raw) return '';
    try {
      return JSON.parse(raw)?._id || '';
    } catch {
      return '';
    }
  }

  private getWishlistCacheKey(userId: string): string {
    return `wishlistProductIds:${userId}`;
  }

  private dispatchWishlistSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dispatchEvent(new CustomEvent('wishlist:sync'));
  }
}
