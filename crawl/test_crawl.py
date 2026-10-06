"""Crawl setup check: fetch a few pages with Crawl4AI using system Chrome and report what comes back."""
import asyncio
import socket
import sys

# User's network has a dead IPv6 route; force IPv4 (see project notes).
_orig = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: [r for r in _orig(*a, **k) if r[0] == socket.AF_INET] or _orig(*a, **k)

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

URLS = sys.argv[1:] or ["https://example.com"]


async def main():
    browser = BrowserConfig(headless=True, chrome_channel="chrome", channel="chrome")
    run = CrawlerRunConfig(page_timeout=45000)
    async with AsyncWebCrawler(config=browser) as crawler:
        for url in URLS:
            r = await crawler.arun(url=url, config=run)
            md = str(r.markdown or "")
            print(f"{url} -> success={r.success} status={r.status_code} markdown_chars={len(md)}")
            print(md[:300].replace("\n", " "), "\n")


asyncio.run(main())
