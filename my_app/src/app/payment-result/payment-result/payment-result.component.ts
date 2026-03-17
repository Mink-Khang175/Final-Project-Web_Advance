import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-payment-result',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './payment-result.component.html',
    styleUrls: ['./payment-result.component.css']
})
export class PaymentResultComponent implements OnInit {
    message: string | null = null;
    orderId: string | null = null;
    amount: string | null = null;
    method: string | null = null;
    isSuccess: boolean = false;

    constructor(private route: ActivatedRoute, private router: Router) { }

    ngOnInit(): void {
        const params = this.route.snapshot.queryParams;
        this.message = params['message'];
        this.orderId = params['orderId'];
        this.amount = params['amount'];
        this.method = params['method'];

        const status = (params['status'] || '').toLowerCase();
        const resultCode = params['resultCode'];
        this.isSuccess = status === 'success' || resultCode === '0';

        if (!this.message) {
            this.message = this.isSuccess ? 'Purchase completed successfully.' : 'Payment failed. Please try again.';
        }
    }

    goBackToHome(): void {
        this.router.navigate(['/home']);
    }

    goToOrders(): void {
        this.router.navigate(['/profile'], { queryParams: { tab: 'orders' } });
    }
}
