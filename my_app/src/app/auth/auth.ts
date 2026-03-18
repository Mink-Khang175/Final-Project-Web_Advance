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
  successMessage = '';

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

  // Field-level errors for Sign In
  loginErrors = {
    email: '',
    password: ''
  };

  // Field-level errors for Sign Up
  signupErrors = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(private api: ApiService, private router: Router) {}

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginErrors = { email: '', password: '' };
    this.signupErrors = { name: '', email: '', password: '', confirmPassword: '' };
  }

  clearLoginError(field: string) {
    if (field in this.loginErrors) {
      (this.loginErrors as Record<string, string>)[field] = '';
    }
  }

  clearSignupError(field: string) {
    if (field in this.signupErrors) {
      (this.signupErrors as Record<string, string>)[field] = '';
    }
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private validateLoginForm(): boolean {
    let valid = true;
    this.loginErrors = { email: '', password: '' };

    if (!this.loginEmail.trim()) {
      this.loginErrors.email = 'Email is required';
      valid = false;
    } else if (!this.validateEmail(this.loginEmail)) {
      this.loginErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (!this.loginPassword) {
      this.loginErrors.password = 'Password is required';
      valid = false;
    }

    return valid;
  }

  private validateSignUpForm(): boolean {
    let valid = true;
    this.signupErrors = { name: '', email: '', password: '', confirmPassword: '' };

    if (!this.signupName.trim()) {
      this.signupErrors.name = 'Full name is required';
      valid = false;
    }

    if (!this.signupEmail.trim()) {
      this.signupErrors.email = 'Email is required';
      valid = false;
    } else if (!this.validateEmail(this.signupEmail)) {
      this.signupErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (!this.signupPassword) {
      this.signupErrors.password = 'Password is required';
      valid = false;
    } else if (this.signupPassword.length < 6) {
      this.signupErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!this.signupConfirmPassword) {
      this.signupErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (this.signupPassword !== this.signupConfirmPassword) {
      this.signupErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    return valid;
  }

  onSignIn(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateLoginForm()) return;

    this.api.loginAdmin(this.loginEmail, this.loginPassword).subscribe({
      next: (admin) => {
        localStorage.setItem('loggedInUser', JSON.stringify(admin));
        window.dispatchEvent(new Event('user-profile-updated'));
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.api.login(this.loginEmail, this.loginPassword).subscribe({
          next: (user) => {
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            window.dispatchEvent(new Event('user-profile-updated'));
            this.router.navigate(['/profile']);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Invalid email or password';
          }
        });
      }
    });
  }

  onSignUp(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (!this.validateSignUpForm()) return;

    this.api.register({
      email: this.signupEmail,
      password: this.signupPassword,
      name: this.signupName,
      phone: this.signupPhone,
      address: this.signupAddress
    }).subscribe({
      next: () => {
        const registeredEmail = this.signupEmail;
        // Reset signup fields
        this.signupName = '';
        this.signupEmail = '';
        this.signupPhone = '';
        this.signupAddress = '';
        this.signupPassword = '';
        this.signupConfirmPassword = '';
        this.signupErrors = { name: '', email: '', password: '', confirmPassword: '' };
        // Prefill login email & show success on Sign In form
        this.loginEmail = registeredEmail;
        this.successMessage = 'Account created successfully! Please sign in.';
        // Flip to Sign In form
        this.isSignUpMode = false;
        this.errorMessage = '';
      },
      error: (err) => {
        const msg = err.error?.message || 'Registration failed';
        this.errorMessage = msg;
        // Show inline error on the email field for duplicate-email responses
        if (msg.toLowerCase().includes('email')) {
          this.signupErrors.email = msg;
        }
      }
    });
  }
}
