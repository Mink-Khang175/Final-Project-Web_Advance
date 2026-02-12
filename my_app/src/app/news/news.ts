import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  enclosure?: {
    link?: string;
  };
}

interface FeedData {
  items?: FeedItem[];
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, Header, Footer],
  templateUrl: './news.html',
  styleUrl: './news.css',
})
export class News implements OnInit {
  articles: FeedItem[] = [];
  loading = true;
  error = false;

  private readonly RSS_URL = "https://rss2json.com/api.json?rss_url=https://www.harpersbazaar.com/rss/fashion.xml";

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchFeed();
    }
  }

  async fetchFeed(): Promise<void> {
    try {
      const res = await fetch(this.RSS_URL);
      const data: FeedData = await res.json();
      this.articles = (data.items || []).slice(0, 12);
      this.loading = false;
    } catch (err) {
      console.error('Error fetching feed:', err);
      this.error = true;
      this.loading = false;
    }
  }

  getImageUrl(item: FeedItem): string {
    return item.enclosure?.link || 'https://via.placeholder.com/400x260?text=No+Image';
  }

  stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').slice(0, 90) + '...';
  }
}
