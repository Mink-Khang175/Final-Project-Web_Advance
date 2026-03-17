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

    this.compressImage(file).then((base64) => {
      this.avatarDataUrl = base64;

      // Always emit so parent can persist locally immediately.
      this.avatarChanged.emit(base64);

      // Save directly into Users collection via existing PUT endpoint
      if (this.userId) {
        this.isUploading = true;
        this.api.updateUser(this.userId, { image: base64, avatar: base64 }).subscribe({
          next: (user) => {
            this.isUploading = false;
            this.avatarChanged.emit(user.image || user.avatar || base64);
          },
          error: () => {
            this.isUploading = false;
            // Parent already received base64 and persisted local fallback
          }
        });
      }
    }).catch(() => {
      // Ignore invalid image files
    });
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 320;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const width = Math.round(img.width * ratio);
          const height = Math.round(img.height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // JPEG keeps payload small enough for API/localStorage persistence.
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = () => reject(new Error('Invalid image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Read error'));
      reader.readAsDataURL(file);
    });
  }
}
