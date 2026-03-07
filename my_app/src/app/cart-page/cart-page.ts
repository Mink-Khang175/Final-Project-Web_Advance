import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ApiService, CartItem } from '../api.service';

@Component({
  selector: 'app-cart-page',
  imports: [CommonModule, RouterModule, Header, Footer],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage implements OnInit {
  cartItems: CartItem[] = [];
  loading = true;
  private userId = '';

  get subtotal(): number {
    return this.cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  get shipping(): number {
    return this.subtotal >= 500000 ? 0 : 30000;
  }

  get total(): number {
    return this.subtotal + this.shipping;
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('loggedInUser');
      if (!user) { this.router.navigate(['/auth']); return; }
      this.userId = JSON.parse(user)._id || '';
      this.loadCart();
    }
  }

  loadCart(): void {
    this.loading = true;
    this.api.getCart(this.userId).subscribe({
      next: (cart) => { this.cartItems = cart?.items || []; this.loading = false; },
      error: () => { this.cartItems = []; this.loading = false; }
    });
  }

  increaseQty(item: CartItem): void {
    if (!item._id) return;
    this.api.updateCartItem(this.userId, item._id, item.quantity + 1).subscribe({
      next: (cart) => { this.cartItems = cart?.items || []; window.dispatchEvent(new Event('cart-updated')); }
    });
  }

  decreaseQty(item: CartItem): void {
    if (!item._id || item.quantity <= 1) return;
    this.api.updateCartItem(this.userId, item._id, item.quantity - 1).subscribe({
      next: (cart) => { this.cartItems = cart?.items || []; window.dispatchEvent(new Event('cart-updated')); }
    });
  }

  removeItem(item: CartItem): void {
    if (!item._id) return;
    this.api.removeCartItem(this.userId, item._id).subscribe({
      next: (cart) => { this.cartItems = cart?.items || []; window.dispatchEvent(new Event('cart-updated')); }
    });
  }

  checkout(): void {
    this.router.navigate(['/checkout']);
  }
}
