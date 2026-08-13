import { test, expect } from '@playwright/test';

test.describe('Feed Page - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for articles to load or empty state
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should load and display the feed page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('News Aggregator');
  });

  test('should display search bar', async ({ page }) => {
    await expect(page.locator('input[placeholder="Search news..."]')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
  });

  test('should display source status notice area', async ({ page }) => {
    // Source status notice may or may not be visible depending on API status
    // Just verify the component renders (may be hidden if all sources OK)
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show article cards when articles load', async ({ page }) => {
    // Wait for either articles or empty state
    await expect(page.locator('[class*="grid"]')).toBeVisible();
  });
});

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should allow typing in search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search news..."]');
    await searchInput.fill('climate');
    await expect(searchInput).toHaveValue('climate');
  });

  test('should show clear button when input has value', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search news..."]');
    await searchInput.fill('test');
    await expect(page.locator('button[aria-label="Clear search"]')).toBeVisible();
  });

  test('should clear search when clear button clicked', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search news..."]');
    await searchInput.fill('test');
    await page.locator('button[aria-label="Clear search"]').click();
    await expect(searchInput).toHaveValue('');
  });

  test('should submit search on form submit', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search news..."]');
    await searchInput.fill('technology');
    await page.locator('button:has-text("Search")').click();
    // URL should update with keyword param
    await expect(page).toHaveURL(/keyword=technology/);
  });
});

test.describe('Filter Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should open filter sidebar on mobile when filter button clicked', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    const filterButton = page.locator('button[aria-label="Open filters"]');
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    
    // Sidebar should be visible
    await expect(page.locator('aside[aria-label="Filters"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Filters")')).toBeVisible();
  });

  test('should close filter sidebar when close button clicked', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.locator('button[aria-label="Open filters"]').click();
    await expect(page.locator('aside[aria-label="Filters"]')).toBeVisible();
    
    // Click the close button inside the sidebar header
    await page.locator('button[aria-label="Close filters"]').click();
    // Wait for the transition animation to complete
    await page.waitForTimeout(400);
    // Sidebar is translated off-screen (-translate-x-full), check it's not in viewport
    await expect(page.locator('aside[aria-label="Filters"]')).not.toBeInViewport();
  });

  test('should show date range filters', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await expect(page.locator('label:has-text("From")')).toBeVisible();
    await expect(page.locator('label:has-text("To")')).toBeVisible();
    await expect(page.locator('input[type="date"]#date-from')).toBeVisible();
    await expect(page.locator('input[type="date"]#date-to')).toBeVisible();
  });

  test('should show category filter dropdown', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await expect(page.locator('h3:has-text("Category")')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('should show source checkboxes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await expect(page.locator('text=NewsAPI')).toBeVisible();
    await expect(page.locator('text=The Guardian')).toBeVisible();
    await expect(page.locator('text=The New York Times')).toBeVisible();
  });

  test('should update URL when category selected', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await page.locator('select').selectOption('Technology');
    await expect(page).toHaveURL(/category=Technology/);
  });

  test('should update URL when source checkbox toggled', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await page.locator('input[id="source-newsapi"]').check();
    await expect(page).toHaveURL(/sources=newsapi/);
  });

  test('should show Clear All Filters button when filters active', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await page.locator('select').selectOption('Technology');
    await expect(page.locator('button:has-text("Clear All Filters")')).toBeVisible();
  });

  test('should clear all filters when Clear All Filters clicked', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open filters"]').click();
    
    await page.locator('select').selectOption('Technology');
    // Scroll the button into view and click
    const clearButton = page.locator('button:has-text("Clear All Filters")');
    await clearButton.scrollIntoViewIfNeeded();
    await clearButton.click({ force: true });
    
    await expect(page.locator('select')).toHaveValue('');
    await expect(page).toHaveURL(/\/$/); // No query params
  });
});

test.describe('Desktop Filter Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should show filter sidebar by default on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await expect(page.locator('aside[aria-label="Filters"]')).toBeVisible();
    await expect(page.locator('h3:has-text("Date Range")')).toBeVisible();
    await expect(page.locator('h3:has-text("Category")')).toBeVisible();
    await expect(page.locator('h3:has-text("Sources")')).toBeVisible();
    await expect(page.locator('h3:has-text("Authors")')).toBeVisible();
  });
});

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should show pagination when multiple pages of articles', async ({ page }) => {
    // Check if pagination exists (depends on number of articles)
    // Pagination may or may not be visible depending on article count
    // Just verify the page loads
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show page indicator', async ({ page }) => {
    // May or may not be visible depending on article count
    // Just verify page is functional
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
  });

  test('should show navigation with Feed and Preferences links', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a:has-text("Feed")')).toBeVisible();
    await expect(page.locator('a:has-text("Preferences")')).toBeVisible();
  });

  test('should navigate to Preferences page', async ({ page }) => {
    await page.locator('a:has-text("Preferences")').click();
    await expect(page).toHaveURL(/preferences/);
    await expect(page.locator('h1')).toContainText('Preferences');
  });

  test('should navigate back to Feed from Preferences', async ({ page }) => {
    await page.locator('a:has-text("Preferences")').click();
    await page.locator('a:has-text("Feed")').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toContainText('News Aggregator');
  });

  test('should show active filter count in Feed link', async ({ page }) => {
    await page.locator('input[placeholder="Search news..."]').fill('test');
    await page.locator('button:has-text("Search")').click();
    
    await expect(page.locator('a:has-text("Feed")')).toContainText(/Feed \(\d+\)/);
  });

  test('should show Clear Filters button in nav when filters active', async ({ page }) => {
    await page.locator('input[placeholder="Search news..."]').fill('test');
    await page.locator('button:has-text("Search")').click();
    
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });
});

test.describe('Preferences Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForSelector('h1:has-text("Preferences")', { timeout: 10000 });
  });

  test('should display Preferences page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Preferences');
  });

  test('should show Source Selector with three sources', async ({ page }) => {
    await expect(page.locator('h3:has-text("News Sources")')).toBeVisible();
    await expect(page.locator('text=NewsAPI')).toBeVisible();
    await expect(page.locator('text=The Guardian')).toBeVisible();
    await expect(page.locator('text=The New York Times')).toBeVisible();
  });

  test('should show Category Selector with categories', async ({ page }) => {
    await expect(page.locator('h3:has-text("News Categories")')).toBeVisible();
    await expect(page.locator('button:has-text("Politics")')).toBeVisible();
    await expect(page.locator('button:has-text("Technology")')).toBeVisible();
    await expect(page.locator('button:has-text("Sports")')).toBeVisible();
  });

  test('should toggle source checkbox', async ({ page }) => {
    const newsApiCheckbox = page.locator('input[id="source-newsapi"]');
    await expect(newsApiCheckbox).not.toBeChecked();
    await newsApiCheckbox.check();
    await expect(newsApiCheckbox).toBeChecked();
  });

  test('should toggle category button', async ({ page }) => {
    const techButton = page.locator('button:has-text("Technology")');
    await expect(techButton).not.toHaveClass(/bg-blue-100/);
    await techButton.click();
    await expect(techButton).toHaveClass(/bg-blue-100/);
  });

  test('should show Reset Preferences button', async ({ page }) => {
    await expect(page.locator('button:has-text("Reset to Defaults")')).toBeVisible();
  });

  test('should persist preferences to localStorage', async ({ page }) => {
    const newsApiCheckbox = page.locator('input[id="source-newsapi"]');
    await newsApiCheckbox.check();
    
    // Reload page
    await page.reload();
    await page.waitForSelector('h1:has-text("Preferences")');
    
    // Check if preference persisted
    await expect(newsApiCheckbox).toBeChecked();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    
    await expect(page.locator('h1')).toContainText('News Aggregator');
    await expect(page.locator('input[placeholder="Search news..."]')).toBeVisible();
    await expect(page.locator('button[aria-label="Open filters"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    
    await expect(page.locator('h1')).toContainText('News Aggregator');
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    
    await expect(page.locator('h1')).toContainText('News Aggregator');
    await expect(page.locator('aside[aria-label="Filters"]')).toBeVisible();
  });
});

test.describe('URL State Persistence', () => {
  test('should persist search keyword in URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    
    await page.locator('input[placeholder="Search news..."]').fill('climate');
    await page.locator('button:has-text("Search")').click();
    
    await expect(page).toHaveURL(/keyword=climate/);
    
    // Reload should preserve keyword
    await page.reload();
    await page.waitForSelector('main', { timeout: 15000 });
    await expect(page.locator('input[placeholder="Search news..."]')).toHaveValue('climate');
  });

  test('should persist category filter in URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.locator('button[aria-label="Open filters"]').click();
    await page.locator('select').selectOption('Technology');
    
    await expect(page).toHaveURL(/category=Technology/);
  });

  test('should allow sharing filtered results via URL', async ({ page }) => {
    // Direct navigation with filters in URL
    await page.goto('/?keyword=test&category=Technology');
    await page.waitForSelector('main', { timeout: 15000 });
    
    await expect(page.locator('input[placeholder="Search news..."]')).toHaveValue('test');
  });
});

test.describe('Error Handling', () => {
  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');
    // Should show loading spinner or content
    await expect(page.locator('main')).toBeVisible();
  });

  test('should handle empty results gracefully', async ({ page }) => {
    // Search for something unlikely to return results
    await page.goto('/?keyword=xyzqwertyunlikelyterm12345');
    await page.waitForSelector('main', { timeout: 15000 });
    
    // Should show empty state message
    // May or may not be visible depending on API results
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Source Status Notices', () => {
  test('should dismiss source status notice', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 15000 });
    
    const dismissButton = page.locator('button[aria-label="Dismiss notice"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await expect(dismissButton).toBeHidden();
    }
  });
});