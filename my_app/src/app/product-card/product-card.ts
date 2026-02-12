import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  imageHover?: string;
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
export class ProductCard {
  @Input() product!: Product;
  @Input() detailUrl: string = '';
  @Output() buyNow = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();

  constructor(private router: Router) {}

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

  navigateToDetail(): void {
    if (this.detailUrl) {
      window.location.href = this.detailUrl;
    }
  }

  get displayPrice(): number {
    return this.product.sale || this.product.price;
  }

  get hasDiscount(): boolean {
    return !!this.product.sale && this.product.sale < this.product.price;
  }
}
