# Silver & Salt Capital — Brand Standards

## Logo: Horizontal Mark

The Silver & Salt Capital logo consists of the **split-circle icon** paired with the **wordmark**. Two approved treatments exist depending on context.

### Primary (Navigation / Hero)
- **Font:** Cormorant Garamond, weight 700 (bold)
- **Size:** 28px
- **Letter-spacing:** -0.01em
- **Split-circle:** 36px, Cormorant Garamond ampersand at weight 600, 19px
- **Use when:** The logo needs to compete with other elements — navigation bars, page headers, overlaid on images, or anywhere requiring visual punch through busy backgrounds.

### Secondary (Footer / Stationery / Print)
- **Font:** Cormorant Garamond, weight 300 (light)
- **Size:** 22px
- **Letter-spacing:** -0.02em
- **Split-circle:** 40px, Cormorant Garamond ampersand at weight 300, 21px
- **Use when:** The logo appears in a quiet, grounded context — footers, letterheads, business cards, presentation closings, or anywhere luxury restraint is appropriate.

### Compact / Partnership Mark
- **Use when:** Co-branding strips, partner postcards, event materials, or any context requiring less horizontal space than the full wordmark.
- **Layout:** S [split-circle badge] S on one row, italic "Capital" centered below
- **S letters:** Cormorant Garamond, weight 700, 26px, color moss (#2F3E34)
- **Split-circle badge:** 48px diameter, moss left / pop right, Cormorant Garamond ampersand at weight 600
- **S-to-badge gap:** 4px (tight)
- **"Capital" text:** Cormorant Garamond, weight 300, italic, 14px, color sage (#7E8E84)
- **Capital vertical gap:** 2px (snug — reads as one unit with the mark row)
- **On dark backgrounds:** S letters in #F0EDE7, badge left half sage (#7E8E84), "Capital" in rgba(240,237,231,0.45). See "On Dark Backgrounds" section for approved treatments.
- **Mockup reference:** `_reference/logo-compact-mockups.html`

### Wordmark Rules
- In horizontal logo treatments, **"Silver & Salt Capital" must always appear on a single line.** Never split or wrap the wordmark across multiple lines.
- The wordmark and split-circle should always appear together in horizontal marks — never the wordmark alone.
- **The ampersand (&) in the wordmark must always use `font-style: normal` (upright), never italic.** The Cormorant Garamond serif ampersand in its upright form is the brand character. An italic ampersand renders as a curly/script form that is not part of the brand identity. This applies everywhere the wordmark appears — nav, footer, brand assets, mockups, exports.

### Split-Circle Icon
- Half moss (#2F3E34), half pop/rust (#D16B4F)
- White ampersand "&" centered, Cormorant Garamond serif
- Can be used standalone as a favicon or social avatar

### On Dark Backgrounds

On dark backgrounds (moss, ink blue, or any dark surface), the standard split-circle left half (moss #2F3E34) disappears. Three approved on-dark treatments exist:

#### Approved On-Dark Treatments
- **A. Standard (moss left / accent right)** — acceptable when the background provides enough contrast (e.g., ink blue #3D5A99). The left half may be subtle but reads as intentional.
- **D. Outlined (cream outline left / filled accent right)** — the left half uses a cream (#F0EDE7) stroke outline instead of a filled half. Elegant and sophisticated. Use when the logo needs to feel refined on dark surfaces.
- **E. Sage left / accent right** — the left half uses sage (#7E8E84) instead of moss. Stays in the green family but provides visible contrast on dark backgrounds. **This is the preferred treatment for the website.**

For the **rust colorway**, "accent right" = #D16B4F.
For the **plum colorway**, "accent right" = #8B5E83.

#### Disallowed On-Dark Treatments
The following treatments are **not permitted** and are not part of the brand:
- Cream-filled (#F0EDE7) or white-filled left half — too much contrast, reads as a different logo
- Full white wordmark — breaks the warmth of the brand
- Rust-colored ampersand in the wordmark — the ampersand should always be muted/subdued, never accent-colored

---

## Tagline

> *Connecting capital to Utah founders who use it best.*

- **Font:** Cormorant Garamond, weight 300, italic
- **Color:** Sage (#7E8E84)
- **Size:** 15px in footer context; scale proportionally elsewhere
- **Usage:** Appears below the wordmark. Always in italic. Never in all-caps. The period is part of the tagline.

---

## Ampersand Watermark (Design Component)

The ampersand "&" is a signature design element that can be used as a large-scale background watermark throughout Silver & Salt materials.

### Specifications
- **Font:** Cormorant Garamond, weight 300
- **Opacity:** 3-4% (barely visible, felt more than seen)
- **Color:** Moss (#2F3E34) on light backgrounds; white on dark backgrounds
- **Size:** 280-400px depending on container (should feel monumental)
- **Position:** Typically right-aligned or right-of-center, vertically centered in the container. Can also be centered.

### Approved Uses
- Footer background (right-aligned, partially cropped by edge)
- Section dividers or transition areas
- Presentation slide backgrounds
- Print materials (letterhead, report covers)
- Email signatures or headers

### Guidelines
- Never at full opacity — always a whisper, not a shout
- Should not interfere with text readability
- Works on both light (sand/cream) and dark (moss) backgrounds
- The watermark creates a subtle sense of brand presence without competing with content

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Cream | #FBF8F2 | Primary background |
| Sand | #F4EFE6 | Secondary background, footer |
| Moss | #2F3E34 | Primary text, dark surfaces |
| Moss Light | #4A5E50 | Body text |
| Sage | #7E8E84 | Muted text, tagline |
| Pop/Rust | #D16B4F | Accent, buttons, split-circle right half |
| Pop Hover | #E07A5E | Hover states, highlights |

---

## Typography

| Role | Family | Weight | Notes |
|------|--------|--------|-------|
| Display / Wordmark (bold) | Cormorant Garamond | 700 | Nav logo, hero headings |
| Display / Wordmark (light) | Cormorant Garamond | 300 | Footer logo, elegant contexts |
| Display / Italic | Cormorant Garamond | 300 italic | Tagline, pull quotes |
| Headings | Satoshi | 900 | Section titles, stats |
| Labels / UI | Satoshi | 700 | Navigation, buttons, uppercase labels |
| Body | Inter | 300-500 | Paragraph text |

### Type Scale (CSS custom properties)

| Token | Size | Usage |
|-------|------|-------|
| --text-2xs | 11px | Fine print, footnotes |
| --text-xs | 12px | Source citations |
| --text-sm | 13px | Labels, captions |
| --text-base | 15px | Base UI text |
| --text-md | 16px | Card descriptions |
| --text-lg | 17px | Body paragraphs |
| --text-xl | 18px | Large body text |
| --text-2xl | 19px | Section intros |
| --text-3xl | 20px | Subheadings |
| --text-4xl | 22px | Large subheadings |

Inline body text in `index.html` uses 17px as the standard paragraph size. Minimum readable text should be 15px. The type scale was increased +2px from original values in April 2026 to improve readability for older audiences.

---

## Copy Standards

### Consistent CTA Language
- All primary CTA buttons use **"Join Us"** — never "Apply Now" or other variants.

### Key Terminology
- **"exit (return your investment) faster"** — always parenthetically define "exit" for non-investor audiences.
- **"Accredited investor"** — define on first use per SEC rules ($200K income / $1M net assets).
- **Angel investing, syndicate, SPV, SAFE, IRR** — all defined in the Angel Investing 101 accordion on the How It Works page.

### Utah Paradox Framing
- Preferred phrasing: *"In the United States, Utah is ranked #3 to start a business. #50 for women's equality."*
- Follow with: *"The gap between being a great place to start a business and being challenging for women's equality is exactly what makes the opportunity so exciting."*
- Avoid: "That's not a contradiction" or dismissive framings of the inequality.

### Thesis Page Section Order
1. Hero — "Utah's high-performing founders are underfunded"
2. The Utah Paradox — #3/#50 with stat cards
3. Not new. Just new to Utah. — national landscape map + org examples
4. The Science of Small Bets — portfolio math + convergence chart
5. The Data — "Don't take our word for it" + performance stats
6. Sources & methodology

### Section Color Pattern (Thesis Page)
Blue → Cream → Green → Cream → Blue — alternating for contrast.

---

## Footer Layout

The standard footer uses:
- **Background:** Sand (#F4EFE6)
- **Top border:** 1px solid rgba(47,62,52,0.08) — matches nav border
- **Layout:** Flexbox, space-between. Brand left, copyright right.
- **Left side:** Split-circle icon + wordmark (light) + tagline (italic)
- **Right side:** Copyright line, small, muted (opacity 0.35)
- **Background element:** Ampersand watermark, right-aligned, 280px, 4% opacity
- **Padding:** 40px top/bottom, 40px sides — compact, not monumental

---

*Last updated: April 2026*
