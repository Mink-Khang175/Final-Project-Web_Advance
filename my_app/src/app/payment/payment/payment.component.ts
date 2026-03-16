import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-payment',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './payment.component.html',
    styleUrls: ['./payment.component.css']
})
export class PaymentComponent {
    amount: number = 50000; // Example amount
    loading: boolean = false;
    errorMsg: string = '';

    constructor(private http: HttpClient) { }

    payWithMoMo() {
        this.loading = true;
        this.errorMsg = '';

        this.http.post<any>('/payment/momo', { amount: this.amount }).subscribe({
            next: (response) => {
                this.loading = false;
                if (response && response.payUrl) {
                    // Redirect the user to MoMo payment gateway
                    window.location.href = response.payUrl;
                } else {
                    this.errorMsg = 'Failed to get payment URL from server.';
                    console.error('Invalid response from server:', response);
                }
            },
            error: (err) => {
                this.loading = false;
                this.errorMsg = 'Error initiating payment. Please try again.';
                console.error('Payment error:', err);
            }
        });
    }
}
