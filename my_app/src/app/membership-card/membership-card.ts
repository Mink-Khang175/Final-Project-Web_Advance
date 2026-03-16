import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

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
  @Input() userId: string = '';
  @Output() avatarChanged = new EventEmitter<string>();

  isFlipped: boolean = false;
  flipCount: number = 0;
  avatarDataUrl: string = '';
  isUploading: boolean = false;

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  readonly defaultAvatarSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 96'%3E%3Crect width='80' height='96' fill='%23e8e8e8'/%3E%3Ccircle cx='40' cy='30' r='18' fill='%23bbb'/%3E%3Cellipse cx='40' cy='78' rx='30' ry='24' fill='%23bbb'/%3E%3C/svg%3E";

  constructor(private api: ApiService) {}

  get displayPhoto(): string {
    return this.avatarDataUrl || this.userPhoto || this.defaultAvatarSvg;
  }

  toggleFlip(): void {
    this.flipCount++;
    this.isFlipped = !this.isFlipped;
  }

  triggerAvatarUpload(): void {
    this.avatarInput.nativeElement.click();
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.avatarDataUrl = base64;

      // Save directly into Users collection via existing PUT endpoint
      if (this.userId) {
        this.isUploading = true;
        this.api.updateUser(this.userId, { image: base64 }).subscribe({
          next: (user) => {
            this.isUploading = false;
            this.avatarChanged.emit(user.image || base64);
          },
          error: () => {
            this.isUploading = false;
            // Still emit local base64 so UI updates even if server fails
            this.avatarChanged.emit(base64);
          }
        });
      }
    };
    reader.readAsDataURL(file);
  }
}
