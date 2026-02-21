import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-membership-card',
  imports: [CommonModule],
  templateUrl: './membership-card.html',
  styleUrl: './membership-card.css',
})
export class MembershipCard {
  @Input() userName: string = '';
  @Input() userEmail: string = '';
  @Input() userPhoto: string = '';
  @Input() userIllustration: string = '';
  @Input() cardNumber: string = '';
  @Input() barcodeNumber: string = '';
  @Input() memberSince: string = '';
  @Input() memberStatus: string = '';

  isFlipped: boolean = false;
  flipCount: number = 0;

  toggleFlip(): void {
    this.flipCount++;
    this.isFlipped = !this.isFlipped;
  }
}
