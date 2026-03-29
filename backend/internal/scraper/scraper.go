package scraper

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/net/html"
)

// FeedItem matches the shared schema definition.
type FeedItem struct {
	ID          string  `json:"id"`
	UserID      string  `json:"user_id,omitempty"`
	Source      Source  `json:"source"`
	Content     Content `json:"content"`
	CollectedAt string  `json:"collected_at"`
}

type Source struct {
	Platform   string `json:"platform"`
	OriginURL  string `json:"origin_url"`
	BadgeColor string `json:"badge_color,omitempty"`
}

type Content struct {
	AuthorHandle string `json:"author_handle,omitempty"`
	Caption      string `json:"caption,omitempty"`
	MediaURL     string `json:"media_url,omitempty"`
	IsVideo      bool   `json:"is_video"`
	EmbedHTML    string `json:"embed_html,omitempty"`
}

var platformColors = map[string]string{
	"instagram": "#E1306C",
	"tiktok":    "#010101",
	"youtube":   "#FF0000",
	"facebook":  "#1877F2",
	"reddit":    "#FF4500",
	"open-web":  "#4A90D9",
}

// Unfurl fetches a URL, extracts OG metadata, and returns a FeedItem.
func Unfurl(rawURL string) (*FeedItem, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Only allow http/https schemes to prevent SSRF
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported scheme: %s", parsed.Scheme)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	resp, err := client.Get(rawURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("non-200 response: %d", resp.StatusCode)
	}

	ogTags := extractOGTags(resp.Body)

	platform := detectPlatform(parsed.Host)
	badgeColor := platformColors[platform]

	item := &FeedItem{
		ID: uuid.New().String(),
		Source: Source{
			Platform:   platform,
			OriginURL:  rawURL,
			BadgeColor: badgeColor,
		},
		Content: Content{
			Caption:   ogTags["og:title"],
			MediaURL:  ogTags["og:image"],
			IsVideo:   ogTags["og:type"] == "video" || ogTags["og:video"] != "",
			EmbedHTML: generateEmbed(platform, rawURL, parsed),
		},
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Try to extract author handle from URL path
	item.Content.AuthorHandle = extractAuthorHandle(platform, parsed)

	return item, nil
}

// generateEmbed produces platform-specific embed HTML.
func generateEmbed(platform, rawURL string, parsed *url.URL) string {
	switch platform {
	case "youtube":
		videoID := ""
		if parsed.Host == "youtu.be" {
			videoID = strings.TrimPrefix(parsed.Path, "/")
		} else if strings.HasPrefix(parsed.Path, "/shorts/") {
			videoID = strings.TrimPrefix(parsed.Path, "/shorts/")
		} else if strings.HasPrefix(parsed.Path, "/live/") {
			videoID = strings.TrimPrefix(parsed.Path, "/live/")
		} else {
			videoID = parsed.Query().Get("v")
		}
		if videoID != "" {
			return fmt.Sprintf(
				`<iframe width="100%%" height="100%%" src="https://www.youtube.com/embed/%s" frameborder="0" allowfullscreen></iframe>`,
				url.PathEscape(videoID),
			)
		}
	case "tiktok":
		// Extract video ID from path: /@user/video/VIDEO_ID
		parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		for i, p := range parts {
			if p == "video" && i+1 < len(parts) {
				return fmt.Sprintf(
					`<iframe width="100%%" height="100%%" src="https://www.tiktok.com/embed/v2/%s" frameborder="0" allowfullscreen allow="autoplay"></iframe>`,
					url.PathEscape(parts[i+1]),
				)
			}
		}
		return ""
	case "instagram":
		// Extract post/reel ID from URL path: /p/SHORTCODE/ or /reel/SHORTCODE/
		parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		for i, p := range parts {
			if (p == "p" || p == "reel") && i+1 < len(parts) {
				shortcode := parts[i+1]
				return fmt.Sprintf(
					`<iframe width="100%%" height="100%%" src="https://www.instagram.com/%s/%s/embed/" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
					url.PathEscape(p), url.PathEscape(shortcode),
				)
			}
		}
		return ""
	case "facebook":
		// Facebook posts: use the oEmbed-style embed with the post URL
		encodedURL := url.QueryEscape(rawURL)
		return fmt.Sprintf(
			`<iframe width="100%%" height="100%%" src="https://www.facebook.com/plugins/post.php?href=%s&show_text=true" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`,
			encodedURL,
		)
	case "reddit":
		// Reddit does not support iframes well; we render as OG card (no embed_html)
		return ""
	}
	return ""
}

// extractAuthorHandle attempts to parse an author handle from the URL path.
func extractAuthorHandle(platform string, parsed *url.URL) string {
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return ""
	}
	switch platform {
	case "instagram", "tiktok":
		handle := parts[0]
		return strings.TrimPrefix(handle, "@")
	case "youtube":
		if len(parts) > 0 && strings.HasPrefix(parts[0], "@") {
			return strings.TrimPrefix(parts[0], "@")
		}
	case "reddit":
		// /r/subreddit/comments/... → extract subreddit
		if len(parts) >= 2 && parts[0] == "r" {
			return "r/" + parts[1]
		}
		// /user/username/... → extract username
		if len(parts) >= 2 && parts[0] == "user" {
			return parts[1]
		}
	}
	return ""
}

func detectPlatform(host string) string {
	h := strings.ToLower(host)
	switch {
	case strings.Contains(h, "instagram"):
		return "instagram"
	case strings.Contains(h, "tiktok"):
		return "tiktok"
	case strings.Contains(h, "youtube") || strings.Contains(h, "youtu.be"):
		return "youtube"
	case strings.Contains(h, "facebook") || strings.Contains(h, "fb.com") || strings.Contains(h, "fb.watch"):
		return "facebook"
	case strings.Contains(h, "reddit") || strings.Contains(h, "redd.it"):
		return "reddit"
	default:
		return "open-web"
	}
}

func extractOGTags(body interface{ Read([]byte) (int, error) }) map[string]string {
	tags := make(map[string]string)
	tokenizer := html.NewTokenizer(body)
	for {
		tt := tokenizer.Next()
		if tt == html.ErrorToken {
			break
		}
		if tt == html.StartTagToken || tt == html.SelfClosingTagToken {
			t := tokenizer.Token()
			if t.Data == "meta" {
				var prop, content string
				for _, attr := range t.Attr {
					if attr.Key == "property" {
						prop = attr.Val
					}
					if attr.Key == "content" {
						content = attr.Val
					}
				}
				if strings.HasPrefix(prop, "og:") && content != "" {
					tags[prop] = content
				}
			}
		}
	}
	return tags
}
