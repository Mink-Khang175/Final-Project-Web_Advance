import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ProductCard, Product as CardProduct } from '../product-card/product-card';
import { ApiService } from '../api.service';

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  images?: string[];
  description?: string;
  sizes?: string[];
  colors?: string[];
  category?: string;
  stock?: number;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Header, Footer, ProductCard],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private destroyRef = inject(DestroyRef);
  product: ApiProduct | null = null;
  mainImage = '';
  gallerySources: string[] = [];
  selectedSize = '';
  selectedColor = '';
  quantity = 1;
  displayPrice = 0;
  originalPrice: number | null = null;
  discountPct: number | null = null;
  isSoldOut = false;
  similarProducts: ApiProduct[] = [];
  errorMessage = '';
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['id'];
      if (!id) {
        this.errorMessage = 'No product ID provided.';
        this.isLoading = false;
        return;
      }
      this.isLoading = true;
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      this.api.getProduct(id).subscribe({
        next: (p: ApiProduct) => {
          this.product = p;
          this.setupProduct(p);
          this.isLoading = false;
          this.cdr.detectChanges();

          if (p.category) {
            this.api.getProducts().subscribe({
              next: (list: any[]) => {
                this.similarProducts = (list || [])
                  .filter((x) => x.category === p.category && x._id !== p._id)
                  .slice(0, 4);
                this.cdr.detectChanges();
              },
              error: () => {}
            });
          }
        },
        error: () => {
          this.errorMessage = 'Product not found.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    });
  }

  private setupProduct(p: ApiProduct): void {
    const normalizedMain = this.normalizeImagePath(p.image);
    const normalizedGallery = (p.images ?? [])
      .map(src => this.normalizeImagePath(src))
      .filter((src): src is string => !!src);

    this.gallerySources = normalizedGallery.length > 0 ? normalizedGallery : (normalizedMain ? [normalizedMain] : []);
    if (normalizedMain && !this.gallerySources.includes(normalizedMain)) {
      this.gallerySources.unshift(normalizedMain);
    }

    this.mainImage = this.gallerySources[0] || normalizedMain || '';

    const base = p.originalPrice ?? p.price;
    const sale = p.discount ? p.price : null;
    this.displayPrice = sale ?? base;
    this.originalPrice = sale ? base : null;
    this.discountPct = (sale && base > 0) ? Math.round(((base - sale) / base) * 100) : null;

    this.isSoldOut = (p.stock ?? 0) <= 0;
    this.selectedSize = p.sizes?.[0] ?? '';
    this.selectedColor = p.colors?.[0] ?? '';
  }

  private normalizeImagePath(path?: string): string {
    if (!path) return '';
    const src = path.trim();
    if (!src) return '';

    if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) {
      return src;
    }

    if (src.startsWith('/assets/')) return src;
    if (src.startsWith('assets/')) return `/${src}`;
    if (src.startsWith('/images/')) return `/assets${src}`;
    if (src.startsWith('images/')) return `/assets/${src}`;

    return `/assets/${src.replace(/^\/+/, '')}`;
  }

  selectImage(src: string): void { this.mainImage = src; }
  decreaseQty(): void { if (this.quantity > 1) this.quantity--; }

  toCardProduct(p: ApiProduct): CardProduct {
    const base = p.originalPrice ?? p.price;
    const sale = p.discount ? p.price : undefined;
    return {
      id: p._id,
      name: p.name,
      price: base,
      sale: sale && sale < base ? sale : undefined,
      image: this.normalizeImagePath(p.image),
      images: (p.images ?? []).map(src => this.normalizeImagePath(src)).filter(Boolean),
      category: p.category
    };
  }

  addToCart(): void {
    if (!this.product || this.isSoldOut || !isPlatformBrowser(this.platformId)) return;

    const raw = localStorage.getItem('loggedInUser');
    if (!raw) {
      this.router.navigate(['/auth']);
      return;
    }

    const item = {
      productId: this.product._id,
      productName: this.product.name,
      price: this.displayPrice,
      image: this.mainImage || this.normalizeImagePath(this.product.image),
      size: this.selectedSize || undefined,
      color: this.selectedColor || undefined,
      quantity: this.quantity
    };

    this.api.addToCart(JSON.parse(raw)._id, item).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          window.dispatchEvent(new Event('cart-updated'));
        }
      },
      error: () => this.toast('Failed to add to cart. Please try again.')
    });
  }

  buyNow(e: Event): void {
    e.preventDefault();
    if (!this.product || this.isSoldOut || !isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem('buyNowItem', JSON.stringify({
      id: this.product._id,
      name: this.product.name,
      price: this.displayPrice,
      image: this.mainImage || this.normalizeImagePath(this.product.image),
      size: this.selectedSize || null,
      color: this.selectedColor || null,
      quantity: this.quantity
    }));
    this.router.navigate(['/checkout']);
  }

  private toast(msg: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const container = document.getElementById('detail-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'detail-toast';
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2200);
  }
}


interface Product {
  id: string | number;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  hoverImage?: string;
  gallery?: string[];
  description?: string;
  details?: string[];
  sizes?: string[];
  colors?: string[];
  status?: string;
  category?: string;
  source?: string;
}

