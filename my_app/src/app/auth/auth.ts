import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  isSignUpMode = false;
  errorMessage = '';

  // Sign In fields
  loginEmail = '';
  loginPassword = '';

  // Sign Up fields
  signupName = '';
  signupEmail = '';
  signupPhone = '';
  signupAddress = '';
  signupPassword = '';
  signupConfirmPassword = '';

  constructor(private api: ApiService, private router: Router) {}

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
    this.errorMessage = '';
  }

  onSignIn(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    this.api.login(this.loginEmail, this.loginPassword).subscribe({
      next: (user) => {
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Invalid email or password';
      }
    });
  }

  onSignUp(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (this.signupPassword !== this.signupConfirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.api.register({
      email: this.signupEmail,
      password: this.signupPassword,
      name: this.signupName,
      phone: this.signupPhone,
      address: this.signupAddress
    }).subscribe({
      next: (user) => {
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed';
      }
    });
  }
}
