import * as cheerio from "cheerio";

export function extractTextContent(html: string, url: string): string {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, iframe, noscript, svg").remove();
  $("[role='navigation'], [role='banner'], [role='contentinfo']").remove();

  const mainContent =
    $("main").text() ||
    $("[role='main']").text() ||
    $("article").text() ||
    $(".content, #content, .main, #main").text() ||
    $("body").text();

  const cleaned = mainContent
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && text && text.length > 3 && text.length < 200) {
      const absoluteUrl = resolveUrl(href, url);
      if (absoluteUrl) {
        links.push(`${text}: ${absoluteUrl}`);
      }
    }
  });

  const linkSection = links.length > 0 ? `\n\nLinks found:\n${links.slice(0, 50).join("\n")}` : "";

  return cleaned.slice(0, 6000) + linkSection;
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}
