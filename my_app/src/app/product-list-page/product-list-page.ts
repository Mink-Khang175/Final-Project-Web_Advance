import { Component, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, isPlatformBrowser, SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from '../header/header';
import { ProductCard, Product } from '../product-card/product-card';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-product-list-page',
  imports: [CommonModule, Header, ProductCard, SlicePipe],
  templateUrl: './product-list-page.html',
  styleUrl: './product-list-page.css',
})
export class ProductListPage implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;

  categories: string[] = [];
  sizes: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  colors: string[] = [];

  selectedCategory: string | null = null;
  selectedSize: string | null = null;
  selectedColor: string | null = null;
  priceSort: '' | 'asc' | 'desc' = '';

  searchQuery = '';
  openFilter: string | null = null;
  colorsExpanded = false;
  private routeSub: Subscription | null = null;
  categoriesExpanded = false;
  readonly COLLAPSED_LIMIT = 6;

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to query param changes (category, search) so URL stays in sync
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.selectedCategory = params.get('category') || null;
      this.searchQuery = params.get('search') || '';
      this.applyFilters();
    });
    this.api.getProducts().subscribe({
      next: (apiProducts) => {
        this.products = apiProducts.map((p: any) => ({
          id: p._id,
          name: p.name,
          price: p.originalPrice || p.price,
          image: p.image || '',
          images: p.images,
          sale: p.discount ? p.price : undefined,
          salePercent: p.discount,
          soldOut: (p.stock ?? 0) <= 0,
          category: p.category,
          imageHover: p.imageHover,
          sizes: p.sizes,
          colors: p.colors,
        }));
        this.extractFilterOptions(apiProducts);
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private extractFilterOptions(apiProducts: any[]): void {
    const catSet = new Set<string>();
    const colorSet = new Set<string>();
    apiProducts.forEach(p => {
      if (p.category) catSet.add(p.category);
      (p.colors || []).forEach((c: string) => colorSet.add(c));
    });
    this.categories = Array.from(catSet).sort();
    this.colors = Array.from(colorSet).sort();
  }

  applyFilters(): void {
    let result = [...this.products];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    if (this.selectedCategory) {
      result = result.filter(p => p.category === this.selectedCategory);
    }
    if (this.selectedSize) {
      result = result.filter(p => (p as any).sizes?.includes(this.selectedSize));
    }
    if (this.selectedColor) {
      result = result.filter(p => (p as any).colors?.includes(this.selectedColor));
    }
    if (this.priceSort === 'asc') {
      result.sort((a, b) => (a.sale || a.price) - (b.sale || b.price));
    } else if (this.priceSort === 'desc') {
      result.sort((a, b) => (b.sale || b.price) - (a.sale || a.price));
    }
    this.filteredProducts = result;
  }

  toggleFilter(name: string, e: MouseEvent): void {
    e.stopPropagation();
    if (this.openFilter === name) {
      this.openFilter = null;
    } else {
      this.openFilter = name;
      this.colorsExpanded = false;
      this.categoriesExpanded = false;
    }
  }

  toggleColorsExpanded(e: Event): void {
    e.stopPropagation();
    this.colorsExpanded = !this.colorsExpanded;
  }

  toggleCategoriesExpanded(e: Event): void {
    e.stopPropagation();
    this.categoriesExpanded = !this.categoriesExpanded;
  }

  setCategory(cat: string | null, e: Event): void {
    e.stopPropagation();
    this.selectedCategory = cat;
    this.openFilter = null;
    this.applyFilters();
  }

  setSize(size: string | null, e: Event): void {
    e.stopPropagation();
    this.selectedSize = size;
    this.openFilter = null;
    this.applyFilters();
  }

  setColor(color: string | null, e: Event): void {
    e.stopPropagation();
    this.selectedColor = color;
    this.openFilter = null;
    this.applyFilters();
  }

  setPriceSort(sort: '' | 'asc' | 'desc', e: Event): void {
    e.stopPropagation();
    this.priceSort = sort;
    this.openFilter = null;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedCategory = null;
    this.selectedSize = null;
    this.selectedColor = null;
    this.priceSort = '';
    this.searchQuery = '';
    this.openFilter = null;
    this.router.navigate(['/product-list'], { queryParams: {} });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openFilter = null;
    this.colorsExpanded = false;
    this.categoriesExpanded = false;
  }

  handleBuyNow(product: Product): void {
    this.router.navigate(['/product-detail'], { queryParams: { id: product.id } });
  }

  handleAddToCart(product: Product): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const user = localStorage.getItem('loggedInUser');
    if (!user) {
      this.router.navigate(['/auth']);
      return;
    }
    const userData = JSON.parse(user);
    this.api.addToCart(userData._id, {
      productId: product.id,
      productName: product.name,
      price: product.sale || product.price,
      quantity: 1,
      image: product.image
    }).subscribe({
      next: () => alert(`${product.name} added to cart!`),
      error: () => alert(`${product.name} added to cart! (offline)`)
    });
  }
}
