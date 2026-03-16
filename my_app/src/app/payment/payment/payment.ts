import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { ApiService, Order } from '../../api.service';

interface PendingCheckoutPayment {
  payload: Partial<Order>;
  mode: 'cart' | 'buynow';
  userId: string;
  customerName: string;
  phone: string;
  amount: number;
  notes?: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, Header, Footer],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment implements OnInit {
  loading = true;
  submitting = false;
  errorMessage = '';
  pendingData: PendingCheckoutPayment | null = null;
  option: 'momo' | 'bank' = 'momo';

  private qrCandidates: Record<'momo' | 'bank', string[]> = {
    momo: [
      '/assets/images/QR/Momo.jpg',
      '/assets/images/QR/momo.png',
      '/assets/images/QR/momo.jpg',
      '/assets/images/QR/momo.jpeg'
    ],
    bank: [
      '/assets/images/QR/Bank.jpg',
      '/assets/images/QR/bank.png',
      '/assets/images/QR/bank.jpg',
      '/assets/images/QR/bank.jpeg'
    ]
  };

  private qrIndex: Record<'momo' | 'bank', number> = { momo: 0, bank: 0 };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = sessionStorage.getItem('pendingCheckoutPayment');
    if (!raw) {
      this.router.navigate(['/checkout']);
      return;
    }

    try {
      this.pendingData = JSON.parse(raw);
      this.loading = false;
    } catch {
      sessionStorage.removeItem('pendingCheckoutPayment');
      this.router.navigate(['/checkout']);
    }
  }

  selectOption(option: 'momo' | 'bank'): void {
    this.option = option;
    this.errorMessage = '';
  }

  get currentQr(): string {
    return this.qrCandidates[this.option][this.qrIndex[this.option]];
  }

  onQrError(): void {
    const current = this.qrIndex[this.option];
    const max = this.qrCandidates[this.option].length - 1;
    if (current < max) {
      this.qrIndex[this.option] = current + 1;
      return;
    }
    this.errorMessage = 'Cannot find QR image in assets/images/QR.';
  }

  confirmPaid(): void {
    if (this.loading || this.submitting || !this.pendingData) return;

    this.submitting = true;
    this.errorMessage = '';

    const payload: Partial<Order> = {
      ...this.pendingData.payload,
      paymentMethod: this.option === 'momo' ? 'momo' : 'banking',
      status: 'success'
    };

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        const orderRef = order.orderNumber || order._id;
        this.cleanupAfterOrder();
        this.router.navigate(['/payment-result'], {
          queryParams: {
            status: 'success',
            method: this.option,
            orderId: orderRef,
            amount: this.pendingData?.amount || payload.totalAmount || 0,
            message: 'Purchase completed successfully.'
          }
        });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to confirm payment. Please try again.';
        this.submitting = false;
      }
    });
  }

  goBackCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  private cleanupAfterOrder(): void {
    if (!this.pendingData) return;
    if (this.pendingData.mode === 'cart') {
      this.api.clearCart(this.pendingData.userId).subscribe({
        next: () => window.dispatchEvent(new Event('cart-updated')),
        error: () => {}
      });
    } else if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('buyNowItem');
    }

    sessionStorage.removeItem('pendingCheckoutPayment');
    this.submitting = false;
  }

}
