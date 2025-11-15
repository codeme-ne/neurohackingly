import DOMPurify from 'dompurify';
import { debounce } from './debounce';

interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    content: string;
    meta: {
      title: string;
      date?: string;
      tags?: string;
    };
    excerpt: string;
    word_count: number;
  }>;
}

interface PagefindSearchResults {
  results: PagefindResult[];
}

interface Pagefind {
  search: (query: string) => Promise<PagefindSearchResults>;
  options: (opts: any) => Promise<void>;
}

type PagefindResultData = Awaited<ReturnType<PagefindResult['data']>>;

class PagefindAssetError extends Error {
  constructor(message = 'Pagefind assets missing') {
    super(message);
    this.name = 'PagefindAssetError';
  }
}

export class SearchModal {
  private modal: HTMLElement;
  private input: HTMLInputElement;
  private results: HTMLElement;
  private loading: HTMLElement;
  private trigger: HTMLElement;
  private closeButton: HTMLElement;
  private backdrop: HTMLElement;
  private pagefind: Pagefind | null = null;
  private selectedIndex: number = -1;
  private originalBodyOverflow = '';
  private debouncedSearch?: ReturnType<typeof debounce>;
  private initialized = false;
  private readonly triggerClickHandler = () => this.open();
  private readonly closeClickHandler = () => this.close();
  private readonly backdropClickHandler = () => this.close();
  private readonly keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly resultsHoverHandler = (event: MouseEvent) => this.handleResultHover(event);

  constructor() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const loading = document.getElementById('search-loading');
    const trigger = document.getElementById('search-trigger');
    const closeButton = document.getElementById('search-close');
    const backdrop = document.getElementById('search-backdrop');

    if (
      !(modal instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement) ||
      !(results instanceof HTMLElement) ||
      !(loading instanceof HTMLElement) ||
      !(trigger instanceof HTMLElement) ||
      !(closeButton instanceof HTMLElement) ||
      !(backdrop instanceof HTMLElement)
    ) {
      throw new Error('SearchModal: Required DOM elements missing');
    }

    this.modal = modal;
    this.input = input;
    this.results = results;
    this.loading = loading;
    this.trigger = trigger;
    this.closeButton = closeButton;
    this.backdrop = backdrop;

    this.debouncedSearch = debounce(this.handleInput.bind(this), 300);
    this.initialized = true;

    this.bindEvents();
    this.showHint();
  }

  private bindEvents() {
    if (!this.initialized || !this.debouncedSearch) {
      return;
    }

    this.trigger.addEventListener('click', this.triggerClickHandler);
    this.closeButton.addEventListener('click', this.closeClickHandler);
    this.backdrop.addEventListener('click', this.backdropClickHandler);
    document.addEventListener('keydown', this.keydownHandler);
    this.input.addEventListener('input', this.debouncedSearch);

    // Use event delegation to avoid re-registering listeners for each result item.
    this.results.addEventListener('mouseover', this.resultsHoverHandler);
  }

  public destroy() {
    if (!this.initialized || !this.debouncedSearch) {
      return;
    }

    this.close();
    this.trigger.removeEventListener('click', this.triggerClickHandler);
    this.closeButton.removeEventListener('click', this.closeClickHandler);
    this.backdrop.removeEventListener('click', this.backdropClickHandler);
    document.removeEventListener('keydown', this.keydownHandler);
    this.input.removeEventListener('input', this.debouncedSearch);
    this.results.removeEventListener('mouseover', this.resultsHoverHandler);
    this.debouncedSearch.cancel();
    this.initialized = false;
  }

  private async loadPagefind(): Promise<Pagefind> {
    if (this.pagefind) {
      return this.pagefind;
    }

    const specifier = '/pagefind/pagefind.js';

    try {
      // Avoid Vite trying to resolve at build time; load at runtime only
      const mod = (await import(/* @vite-ignore */ specifier)) as Pagefind;
      await mod.options({
        ranking: {
          pageLength: 0.5,
          termFrequency: 1.0
        }
      });
      this.pagefind = mod as Pagefind;
      return this.pagefind;
    } catch (err) {
      console.warn(
        'SearchModal: Failed to load Pagefind from /pagefind/pagefind.js. Run "npm run dev:with-search" in development or ensure the Pagefind assets are built for production.',
        err
      );
      throw new PagefindAssetError();
    }
  }

  private async performSearch(query: string) {
    if (!this.initialized) {
      return;
    }

    this.loading.style.display = 'block';
    this.results.innerHTML = '';

    try {
      const pf = await this.loadPagefind();
      const search = await pf.search(query);

      const resultsData = await Promise.all(
        search.results.slice(0, 10).map((r) => r.data())
      );

      this.displayResults(resultsData);
    } catch (error) {
      console.error('Search error:', error);
      const msg =
        error instanceof PagefindAssetError
          ? 'Search index not found. Run "npm run dev:with-search" to enable search in dev or build the site to generate the index.'
          : 'Search failed. Please try again.';
      this.results.innerHTML = `<div class="search-error">${msg}</div>`;
    } finally {
      this.loading.style.display = 'none';
    }
  }

  private displayResults(results: PagefindResultData[]) {
    if (!this.initialized) {
      return;
    }

    this.selectedIndex = -1;
    this.results.innerHTML = '';

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'No results found.';
      this.results.appendChild(noResults);
      return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach((result, index) => {
      const tags = result.meta.tags ? result.meta.tags.split(',').map((t: string) => t.trim()) : [];
      const date = result.meta.date ? new Date(result.meta.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : '';

      // Create result link
      const a = document.createElement('a');
      a.href = result.url;
      a.className = 'search-result';
      a.dataset.index = String(index);

      // Title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'result-title';
      titleDiv.textContent = result.meta.title; // Safe: uses textContent
      a.appendChild(titleDiv);

      // Date
      if (date) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'result-date';
        dateDiv.textContent = date;
        a.appendChild(dateDiv);
      }

      // Excerpt
      if (result.excerpt) {
        const excerptDiv = document.createElement('div');
        excerptDiv.className = 'result-excerpt';
        excerptDiv.innerHTML = DOMPurify.sanitize(result.excerpt);
        a.appendChild(excerptDiv);
      }

      // Tags
      if (tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'result-tags';

        tags.slice(0, 3).forEach((tag: string) => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'result-tag';
          tagSpan.textContent = `#${tag}`; // Safe: uses textContent
          tagsDiv.appendChild(tagSpan);
        });

        a.appendChild(tagsDiv);
      }

      fragment.appendChild(a);
    });

    this.results.appendChild(fragment);
  }

  private showHint() {
    if (!this.initialized) {
      return;
    }

    this.results.innerHTML = '';

    const hintDiv = document.createElement('div');
    hintDiv.className = 'search-hint';

    const kbdCmd = document.createElement('kbd');
    kbdCmd.textContent = 'Cmd';

    const kbdK = document.createElement('kbd');
    kbdK.textContent = 'K';

    const kbdEsc = document.createElement('kbd');
    kbdEsc.textContent = 'Esc';

    hintDiv.append(kbdCmd, '+', kbdK, ' to open • ', kbdEsc, ' to close');
    this.results.appendChild(hintDiv);
  }

  private navigateResults(direction: number) {
    if (!this.initialized) {
      return;
    }

    const resultElements = this.results.querySelectorAll('.search-result');
    if (resultElements.length === 0) return;

    this.selectedIndex += direction;

    if (this.selectedIndex < 0) {
      this.selectedIndex = resultElements.length - 1;
    } else if (this.selectedIndex >= resultElements.length) {
      this.selectedIndex = 0;
    }

    this.updateSelection();
    resultElements[this.selectedIndex]?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }

  private updateSelection() {
    if (!this.initialized) {
      return;
    }

    const resultElements = this.results.querySelectorAll('.search-result');
    resultElements.forEach((el, index) => {
      if (index === this.selectedIndex) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  private selectResult() {
    if (!this.initialized) {
      return;
    }

    const resultElements = this.results.querySelectorAll('.search-result');
    const selected = resultElements[this.selectedIndex] as HTMLAnchorElement;
    if (selected?.href) {
      window.location.href = selected.href;
    }
  }

  private open() {
    if (!this.initialized) {
      return;
    }

    const wasHidden = this.modal.classList.contains('hidden');

    this.modal.classList.remove('hidden');
    this.input.setAttribute('aria-expanded', 'true');

    if (wasHidden) {
      this.originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    this.input.focus();
  }

  private close() {
    if (!this.initialized) {
      return;
    }

    const wasOpen = !this.modal.classList.contains('hidden');

    this.modal.classList.add('hidden');
    this.input.setAttribute('aria-expanded', 'false');

    if (wasOpen) {
      document.body.style.overflow = this.originalBodyOverflow;
    }

    this.input.value = '';
    this.showHint();
    this.selectedIndex = -1;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (!this.initialized) {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.open();
      return;
    }

    if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
      this.close();
      return;
    }

    if (this.modal.classList.contains('hidden')) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigateResults(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.navigateResults(-1);
    } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
      e.preventDefault();
      this.selectResult();
    }
  }

  private async handleInput(e: Event) {
    if (!this.initialized) {
      return;
    }

    const target = e.target as HTMLInputElement;
    const query = target.value.trim();

    if (query.length < 2) {
      this.showHint();
      return;
    }

    await this.performSearch(query);
  }

  private handleResultHover(event: MouseEvent) {
    if (!this.initialized) {
      return;
    }

    const target = (event.target as HTMLElement | null)?.closest('.search-result');
    if (!(target instanceof HTMLElement) || target.dataset.index === undefined) {
      return;
    }

    const parsedIndex = parseInt(target.dataset.index, 10);
    if (Number.isNaN(parsedIndex)) {
      return;
    }

    this.selectedIndex = parsedIndex;
    this.updateSelection();
  }
}
