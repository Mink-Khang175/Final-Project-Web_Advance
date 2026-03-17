import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ChatMessage } from '../api.service';

@Component({
  selector: 'app-chat-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-ai.html',
  styleUrl: './chat-ai.css',
})
export class ChatAI {
  @Input() userName = 'Customer';

  input = '';
  sending = false;
  errorMessage = '';
  messages: ChatMessage[] = [
    {
      role: 'assistant',
      text: 'Hi! I am Ava from AVANT ATELIER. I can help with sizing, order updates, returns, and product recommendations. How can I help you today?'
    }
  ];

  suggestions = [
    'Help me choose size for a relaxed fit sweater.',
    'How does your return process work?',
    'Recommend a minimalist outfit under $200.'
  ];

  constructor(private api: ApiService) {}

  sendMessage(): void {
    const text = this.input.trim();
    if (!text || this.sending) return;

    this.errorMessage = '';
    this.messages.push({ role: 'user', text });
    this.input = '';
    this.sending = true;

    const history = this.messages.slice(0, -1);
    this.api.askAssistant(text, history, this.userName).subscribe({
      next: (reply) => {
        this.messages.push({ role: 'assistant', text: reply });
        this.sending = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Assistant is temporarily unavailable. Please try again.';
        this.messages.push({
          role: 'assistant',
          text: 'Sorry, I am having trouble connecting right now. Please try again in a moment.'
        });
        this.sending = false;
      }
    });
  }

  useSuggestion(text: string): void {
    this.input = text;
    this.sendMessage();
  }

}
