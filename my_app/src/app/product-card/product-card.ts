import { Component, Input, Output, EventEmitter, Inject, PLATFORM_ID, OnChanges, SimpleChanges } from '@angular/core';
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
export class ProductCard implements OnChanges {
  @Input() product!: Product;
  @Input() detailUrl: string = '';
  @Output() buyNow = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();
  isWishlisted = false;
  isWishlistBusy = false;

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

    const raw = localStorage.getItem('loggedInUser');
    if (!raw) {
      this.router.navigate(['/auth']);
      return;
    }

    const userId = JSON.parse(raw)._id;
    if (!userId || !this.product?.id) return;

    this.isWishlistBusy = true;
    const nextState = !this.isWishlisted;
    this.isWishlisted = nextState;
    this.writeWishlistCache(nextState);

    if (!nextState) {
      this.api.removeFromWishlist(userId, this.product.id).subscribe({
        next: () => {
          this.isWishlistBusy = false;
        },
        error: () => {
          this.isWishlisted = true;
          this.writeWishlistCache(true);
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
        this.isWishlistBusy = false;
      },
      error: () => {
        this.isWishlisted = false;
        this.writeWishlistCache(false);
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
    const ids = this.getWishlistCache();
    this.isWishlisted = !!this.product?.id && ids.includes(this.product.id);
  }

  private writeWishlistCache(isAdd: boolean): void {
    if (!isPlatformBrowser(this.platformId) || !this.product?.id) return;
    const ids = this.getWishlistCache();
    const has = ids.includes(this.product.id);
    let next = ids;
    if (isAdd && !has) next = [...ids, this.product.id];
    if (!isAdd && has) next = ids.filter(id => id !== this.product.id);
    localStorage.setItem('wishlistProductIds', JSON.stringify(next));
  }

  private getWishlistCache(): string[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const raw = localStorage.getItem('wishlistProductIds');
    if (!raw) return [];
    try {
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }
}
