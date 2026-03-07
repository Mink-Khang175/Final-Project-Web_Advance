import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ApiService } from '../api.service';

interface Product {
  id: number;
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

interface BackLink {
  href: string;
  label: string;
}

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, FormsModule, RouterModule, Header, Footer],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  standalone: true
})
export class ProductDetail implements OnInit {
  products: Product[] = [];
  product: Product | null = null;
  mainImage: string = '';
  gallerySources: string[] = [];
  selectedSize: string = '';
  selectedColor: string = 'default';
  quantity: number = 1;
  salePrice: number | null = null;
  discountPercent: number | null = null;
  stockStatusMessage: string = '';
  isSoldOut: boolean = false;
  similarProducts: Product[] = [];
  errorMessage: string = '';
  
  backLink: BackLink = { href: '/home', label: 'Back to Home' };
  sourceKey: string = '';
  returnPath: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        // Try loading from backend API
        this.api.getProduct(productId).subscribe({
          next: (apiProduct) => {
            // Convert API product to local Product format
            const p: Product = {
              id: Number(apiProduct._id) || 0,
              name: apiProduct.name,
              price: apiProduct.originalPrice || apiProduct.price,
              salePrice: apiProduct.discount ? apiProduct.price : undefined,
              image: apiProduct.image || '',
              description: apiProduct.description,
              sizes: apiProduct.sizes,
              colors: apiProduct.colors,
              category: apiProduct.category,
              status: (apiProduct.stock ?? 0) <= 0 ? 'sold-out' : 'available'
            };
            this.products = [p];
            this.populateDetail(p.id);

            // Load similar products by category
            if (apiProduct.category) {
              this.api.getProductsByCategory(apiProduct.category).subscribe({
                next: (catProducts) => {
                  this.similarProducts = catProducts
                    .filter(cp => cp._id !== apiProduct._id)
                    .slice(0, 8)
                    .map(cp => ({
                      id: Number(cp._id) || 0,
                      name: cp.name,
                      price: cp.originalPrice || cp.price,
                      salePrice: cp.discount ? cp.price : undefined,
                      image: cp.image || '',
                      category: cp.category
                    }));
                },
                error: () => {}
              });
            }
          },
          error: () => {
            // Fallback to mock data
            this.createMockData();
            const numericId = Number(productId) || 1;
            this.populateDetail(numericId);
          }
        });
      } else {
        // No ID provided, use mock
        this.createMockData();
        this.populateDetail(1);
      }
    });
  }

  private createMockData(): void {
    // Mock data để demo giao diện
    this.products = [
      {
        id: 1,
        name: 'Premium Cotton T-Shirt',
        price: 49.99,
        salePrice: 39.99,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        hoverImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400',
        gallery: [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400',
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400'
        ],
        description: 'Premium quality cotton t-shirt with modern design. Perfect for casual wear and everyday comfort.',
        details: [
          '100% Premium Cotton',
          'Machine Washable',
          'Available in Multiple Sizes',
          'Modern Fit Design'
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Blue', 'Gray'],
        status: 'available',
        category: 'Tops'
      },
      {
        id: 2,
        name: 'Classic Denim Jeans',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
        description: 'Classic fit denim jeans with premium quality fabric.',
        sizes: ['28', '30', '32', '34', '36'],
        colors: ['Blue', 'Black'],
        category: 'Bottoms'
      },
      {
        id: 3,
        name: 'Leather Wallet',
        price: 29.99,
        salePrice: 24.99,
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
        description: 'Genuine leather wallet with multiple card slots.',
        colors: ['Brown', 'Black'],
        category: 'Accessories'
      },
      {
        id: 4,
        name: 'Casual Hoodie',
        price: 59.99,
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
        description: 'Comfortable hoodie perfect for cool weather.',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Gray', 'Black', 'Navy'],
        category: 'Tops'
      }
    ];
  }

  private populateDetail(targetId: number): void {
    this.product = this.products.find(item => item.id === targetId) || null;

    if (!this.product) {
      this.showError('We could not find that product.');
      return;
    }

    // Setup images
    this.gallerySources = this.buildGallerySources(this.product);
    this.mainImage = this.gallerySources[0] || this.product.image;

    // Setup pricing
    this.salePrice = this.resolveSalePrice(this.product);
    this.discountPercent = this.computeDiscountPercent(this.product.price, this.salePrice);

    // Setup sizes
    if (this.product.sizes && this.product.sizes.length > 0) {
      this.selectedSize = this.product.sizes[0];
    }

    // Setup stock status
    this.isSoldOut = String(this.product.status || '').toLowerCase() === 'sold-out';
    if (this.isSoldOut) {
      this.stockStatusMessage = 'Sold out';
    } else if (this.salePrice != null) {
      this.stockStatusMessage = 'On sale';
    }

    // Setup similar products
    this.renderSimilarProducts(targetId);
  }

  private buildGallerySources(product: Product): string[] {
    const sources: string[] = [];
    const addSource = (src?: string) => {
      if (src && !sources.includes(src)) sources.push(src);
    };

    addSource(product.image);
    addSource(product.hoverImage);
    if (Array.isArray(product.gallery)) {
      product.gallery.forEach(addSource);
    }

    return sources;
  }

  private resolveSalePrice(product: Product): number | null {
    if (!product || product.salePrice == null) return null;
    const numeric = Number(product.salePrice);
    const base = Number(product.price);
    if (!Number.isFinite(numeric) || !Number.isFinite(base)) return null;
    if (numeric >= base || base <= 0) return null;
    return numeric;
  }

  private computeDiscountPercent(original: number, sale: number | null): number | null {
    if (sale == null) return null;
    const originalValue = Number(original);
    const saleValue = Number(sale);
    if (!Number.isFinite(originalValue) || !Number.isFinite(saleValue)) return null;
    if (saleValue >= originalValue || originalValue <= 0) return null;
    return Math.round(((originalValue - saleValue) / originalValue) * 100);
  }

  private renderSimilarProducts(activeId: number): void {
    this.similarProducts = this.products
      .filter(item => item.id !== activeId)
      .slice(0, 8);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.product = null;
  }

  selectImage(src: string): void {
    this.mainImage = src;
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }

  getSalePrice(product: Product): number | null {
    return this.resolveSalePrice(product);
  }

  getDiscountPercent(product: Product): number | null {
    const salePrice = this.resolveSalePrice(product);
    return this.computeDiscountPercent(product.price, salePrice);
  }

  addToCart(): void {
    if (!this.product || this.isSoldOut) return;

    const user = localStorage.getItem('loggedInUser');
    const cartItem = {
      productId: String(this.product.id),
      productName: this.product.name,
      price: this.salePrice || this.product.price,
      image: this.product.image,
      size: this.selectedSize || undefined,
      color: this.selectedColor,
      quantity: this.quantity
    };

    if (user) {
      const userData = JSON.parse(user);
      this.api.addToCart(userData._id, cartItem).subscribe({
        next: () => this.showDetailToast('Added to cart!'),
        error: () => {
          // Fallback to localStorage
          this.saveCartLocally(cartItem);
          this.showDetailToast('Added to cart!');
        }
      });
    } else {
      this.saveCartLocally(cartItem);
      this.showDetailToast('Added to cart!');
    }
  }

  private saveCartLocally(cartItem: any): void {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex((item: any) => 
      item.productId === cartItem.productId && 
      item.size === cartItem.size && 
      item.color === cartItem.color
    );
    if (existingIndex > -1) {
      cart[existingIndex].quantity += cartItem.quantity;
    } else {
      cart.push(cartItem);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  buyNow(event: Event): void {
    event.preventDefault();
    
    if (this.isSoldOut || !this.product) {
      return;
    }

    const buyNowItem = {
      id: this.product.id,
      name: this.product.name,
      price: this.salePrice || this.product.price,
      image: this.product.image,
      size: this.selectedSize || null,
      color: this.selectedColor,
      quantity: this.quantity
    };

    sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    // Navigate to checkout page when you create it
    // this.router.navigate(['/checkout'], { queryParams: { mode: 'buyNow' } });
    this.showDetailToast('Buy now feature - checkout page coming soon!');
  }

  private showDetailToast(message: string): void {
    let container = document.getElementById('detail-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'detail-toast-container';
      container.className = 'detail-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'detail-toast';
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }
}

