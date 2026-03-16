import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ApiService, Order, User } from '../api.service';

interface CheckoutItem {
  productId: string;
  productName?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Header, Footer],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage implements OnInit {
  loading = true;
  placingOrder = false;
  orderPlaced = false;
  orderId = '';
  orderItems: CheckoutItem[] = [];
  mode: 'cart' | 'buynow' = 'cart';
  paymentMethod: 'cod' | 'banking' = 'cod';
  errorMessage = '';

  fullName = '';
  phone = '';
  email = '';
  address = '';
  city = '';
  notes = '';

  private userId = '';

  get subtotal(): number {
    return this.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get shippingFee(): number {
    return this.subtotal >= 500000 ? 0 : 30000;
  }

  get total(): number {
    return this.subtotal + this.shippingFee;
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const rawUser = localStorage.getItem('loggedInUser');
    if (!rawUser) {
      this.router.navigate(['/auth']);
      return;
    }

    const user = JSON.parse(rawUser);
    this.userId = user._id || '';
    this.prefillShippingFromUser(user);

    if (this.userId) {
      this.api.getUser(this.userId).subscribe({
        next: (freshUser) => {
          this.prefillShippingFromUser(freshUser);
          const merged = { ...user, ...freshUser };
          localStorage.setItem('loggedInUser', JSON.stringify(merged));
        },
        error: () => {}
      });
    }

    const buyNowRaw = sessionStorage.getItem('buyNowItem');
    if (buyNowRaw) {
      try {
        const item = JSON.parse(buyNowRaw);
        this.mode = 'buynow';
        this.orderItems = [{
          productId: item.id,
          productName: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          size: item.size || undefined,
          color: item.color || undefined,
          image: item.image || undefined
        }];
        this.loading = false;
        return;
      } catch {
        sessionStorage.removeItem('buyNowItem');
      }
    }

    this.mode = 'cart';
    this.api.getCart(this.userId).subscribe({
      next: (cart) => {
        this.orderItems = (cart?.items || []).map(i => ({
          productId: i.productId,
          productName: i.productName,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
          image: i.image
        }));
        this.loading = false;
      },
      error: () => {
        this.orderItems = [];
        this.loading = false;
      }
    });
  }

  placeOrder(): void {
    if (this.placingOrder || this.loading) return;
    this.errorMessage = '';

    if (!this.fullName.trim() || !this.phone.trim() || !this.address.trim() || !this.city.trim()) {
      this.errorMessage = 'Please complete your shipping information.';
      return;
    }
    if (this.orderItems.length === 0) {
      this.errorMessage = 'Your checkout list is empty.';
      return;
    }

    const shippingAddress = [this.address.trim(), this.city.trim()].filter(Boolean).join(', ');
    const payload: Partial<Order> = {
      userId: this.userId,
      items: this.orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      totalAmount: this.total,
      shippingAddress,
      paymentMethod: this.paymentMethod,
      status: 'success'
    };

    if (this.paymentMethod === 'banking') {
      if (!isPlatformBrowser(this.platformId)) return;
      sessionStorage.setItem('pendingCheckoutPayment', JSON.stringify({
        payload,
        mode: this.mode,
        userId: this.userId,
        customerName: this.fullName,
        phone: this.phone,
        amount: this.total,
        notes: this.notes
      }));
      this.router.navigate(['/payment']);
      return;
    }

    this.submitOrder(payload);
  }

  private submitOrder(payload: Partial<Order>): void {
    this.placingOrder = true;
    this.errorMessage = '';

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.orderId = order.orderNumber || order._id;
        this.placingOrder = false;

        this.afterSuccessfulOrder(this.orderId);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Could not place order. Please try again.';
        this.placingOrder = false;
      }
    });
  }

  private afterSuccessfulOrder(orderRef: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.mode === 'cart') {
      this.api.clearCart(this.userId).subscribe({
        next: () => window.dispatchEvent(new Event('cart-updated')),
        error: () => {}
      });
    } else {
      sessionStorage.removeItem('buyNowItem');
    }

    this.orderItems = [];
    this.router.navigate(['/payment-result'], {
      queryParams: {
        status: 'success',
        method: this.paymentMethod,
        orderId: orderRef,
        amount: this.total,
        message: 'Purchase completed successfully.'
      }
    });
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private prefillShippingFromUser(user: Partial<User> & { fullName?: string }): void {
    this.fullName = user.name || user.fullName || this.fullName;
    this.phone = user.phone || this.phone;
    this.email = user.email || this.email;

    const rawAddress = (user.address || '').trim();
    const rawCity = (user.city || '').trim();
    const normalizedAddress = rawAddress.toLowerCase();

    const isCityOnlyAddress =
      normalizedAddress === 'tp.hcm' ||
      normalizedAddress === 'tphcm' ||
      normalizedAddress === 'hcm' ||
      normalizedAddress === 'ho chi minh' ||
      normalizedAddress === 'ho chi minh city';

    if (rawCity) {
      this.city = rawCity;
    } else if (isCityOnlyAddress) {
      this.city = 'TP.HCM';
    }

    this.address = isCityOnlyAddress ? '' : (rawAddress || this.address);
  }

}
