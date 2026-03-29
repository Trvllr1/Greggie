# Greggie: The Unified Social Stream

Greggie is a mobile-first aggregator that centralizes content from fragmented social ecosystems into a single, high-performance feed.

## 🚀 Concept: "The Manual Bridge"
Instead of fighting restricted APIs, Greggie uses a **Share Extension** architecture. Users share URLs from TikTok/IG/FB to Greggie; our backend "unfurls" the metadata and serves it as a standardized stream.

## 🛠 Tech Stack
- **Mobile:** React Native (Expo) + WebView for native embeds.
- **Backend:** Go (for high-concurrency metadata scraping).
- **Data:** PostgreSQL (Stateful storage) + Redis (Feed caching).
- **Architecture:** Infrastructure-first, URL-agnostic ingestion.

## 📋 Core Logic for Agent Setup
1. **Intake:** The Go backend must accept a POST request with a raw URL.
2. **Unfurl:** The backend parses Open Graph (OG) tags to extract `preview_image` and `title`.
3. **Stream:** The Mobile app uses an Intersection Observer to "lazy-load" Embed HTML only when the card is in focus.
4. **Identity:** Every card must display a `SourceBadge` derived from the `source.platform` field.

## 🏗 Setup Instructions
1. Open `greggie.code-workspace` in VS Code.
2. Run `go mod tidy` in `/gre-backend`.
3. Run `npm install` in `/gre-mobile`.
