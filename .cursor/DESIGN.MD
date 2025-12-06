------------------------------------------------------------
OVERVIEW
------------------------------------------------------------
The design across the provided screenshots represents a modern, clean, neo-minimal product aesthetic used by high-end SaaS tools. Core themes include:

• Large amounts of whitespace  
• Soft gradients  
• Very light-gray neutrals  
• Rounded, “airy” UI  
• Subtle shadows  
• Quiet typography with neutral sans-serif fonts  
• Emphasis on simplicity and clarity  
• Focus on functional hierarchy (bold headings, quiet body text)

The UI resembles a mixture of Mercury’s signature visual style (soft lavender gradients, thin icons, plenty of spacing) combined with Intercom’s bolder typography and marketing polish.

This style guide breaks the system down into components that can be implemented in design or TailwindCSS.

------------------------------------------------------------
COLOR PALETTE
------------------------------------------------------------

**Current Implementation (Mercury-style B2B)**

Primary colors  
• Blue (Interaction / CTA):  
  – Primary blue: #3E63F6 (`--primary`)  
  – Hover state: #4F6AFB  
  – Used for primary buttons and key CTAs  

• Hero gradient (Background accent - Mercury-style):  
  – Very subtle, light gradient for hero sections  
  – Almost white at top, gentle lavender wash at bottom  
  – Implementation: `.gradient-purple` class  
  – Gradient stops:  
    – 0%: #FBFCFF (almost white, cool-toned)  
    – 35%: #F9FAFE (very light)  
    – 70%: #F2ECFF (subtle lavender hint)  
    – 100%: #F4E8FB (light pastel lavender)  
  – Provides depth without overwhelming the content  

Neutral grays  
• Page background: #F7F8FA (`--background`)  
• Card/surface white: #FFFFFF (`--card`)  
• Divider lines: #E3E4E8 (`--border`)  
• Muted text: #374151 (`--muted-foreground`) - darker for better readability  
• Body text: #1F2937 (`--foreground`) - darker for better readability  
• Dark headings: #111827 (`text-gray-900`)  

Success / Danger  
• Success green: #0FB46A (`--color-success`)  
• Danger red: #DC3A3A (`--destructive`)  

Interactive states  
• Hover blue: #4F6AFB (lighter version of primary blue)  
• Pressed blue: #2D4ED8 (darker version)  

CSS Variables (shadcn/ui compatible)
• All colors defined in `src/styles/globals.css` using RGB values  
• Format: `--foreground: 31 41 55;` (space-separated RGB)  
• Used with `rgb(var(--foreground))` in CSS  
• TailwindCSS v4 utilities automatically generated from these variables  

Opacity & transparency used frequently on:  
• Cards (white backgrounds with soft shadows)  
• Panels  
• Gradient overlays (very subtle, Mercury-style)  

------------------------------------------------------------
TYPOGRAPHY  
(Pay close attention — this is one of the strongest design signals)
------------------------------------------------------------

Font family  
• A clean geometric/sans font, similar to:  
  – Inter  
  – SF Pro  
  – Graphik (Mercury uses Graphik in official designs)  
  – Avenir / Circular-like tone  

Font weights used  
• 700–800 for major headings  
• 600 for section titles  
• 400–500 for body text  
• 300 for secondary labels / muted UI text  

Font sizes (estimated from the screenshots)

Headings  
• Hero heading (marketing): 56–72px, weight 700–800  
• Dashboard section titles: 20–24px  
• Card titles: 14–16px, weight 500–600  

Body text  
• Standard body: 14–16px  
• Secondary notes: 12–13px  
• Status / helper labels: 11–12px  

Typography usage pattern  
• Marketing pages:  
  – Large, bold typographic hero lines  
  – Big spacing  
  – Centered text alignment  
  – Minimal noise  

• Product dashboard:  
  – Quiet, functional text  
  – Smaller typography  
  – Consistent 14–16px body size  
  – Bold used sparingly to indicate hierarchy  

------------------------------------------------------------
SPACING SYSTEM  
------------------------------------------------------------

The spacing system looks modular and likely follows a 4px or 8px scale.

Probable scale used:  
• 4  
• 8  
• 12  
• 16  
• 20  
• 24  
• 32  
• 40  
• 48  
• 64  

Patterns observed  
• Breadcrumb / small UI items: 8–12px spacing  
• Buttons: 10–14px vertical padding, 18–22px horizontal  
• Card padding: 24–32px  
• Page section spacing: 48–72px  
• Marketing hero spacing: up to 120px  

------------------------------------------------------------
COMPONENT STYLES  
------------------------------------------------------------

**Buttons**  
• Primary button:  
  – Solid blue  
  – Medium border radius  
  – White label  
  – Bold 500–600 text  
  – Subtle shadow or inner-light effect  

• Secondary button:  
  – Gray outline  
  – Transparent background  
  – 1px border  

• Tertiary button:  
  – No border  
  – Text-only with subtle hover  

**Cards / Panels**  
• White background  
• Rounded corners  
• Light 1px gray border  
• 8–16px shadow blur  
• Spacious padding  

**Sidebar**  
• Light gray background  
• Simple icons  
• Generous line spacing  
• States indicated with a subtle highlight bar  

**Tabs / Filters**  
• Pills with rounded radius  
• Soft light-gray backgrounds  
• 14–16px text  

**Charts**  
• Soft gradients and thin lines  
• Muted tones for non-primary data  

------------------------------------------------------------
SHADOWS & ELEVATION  
------------------------------------------------------------

Shadows are extremely soft, almost invisible.

Typical shadow structure:  
• X: 0  
• Y: 2px–4px  
• Blur: 12–20px  
• Color: rgba(0, 0, 0, 0.05–0.12)

Marketing pages use even softer shadows, closer to 0.03–0.06 alpha.

------------------------------------------------------------
ANIMATIONS & TRANSITIONS  
------------------------------------------------------------

Animations appear subtle, with quick easing.

Likely transitions:  
• 150–200ms  
• cubic-bezier(0.4, 0, 0.2, 1) (Material-like)  
• Used on:  
  – Button hovers  
  – Dropdowns  
  – Hover cards  
  – Page transitions  

------------------------------------------------------------
BORDER RADIUS  
------------------------------------------------------------

Radiuses used:  
• Buttons: 6–8px  
• Cards: 10–12px  
• Input fields: 6px  
• Pills / filter chips: 9999px (full rounding)  

------------------------------------------------------------
OPACITY & TRANSPARENCY  
------------------------------------------------------------

Opacity usage patterns:  
• Disabled buttons: 0.4–0.6  
• Subtext: 0.6–0.7  
• Graph background gradients: 0.1–0.2  

------------------------------------------------------------
COMMON TAILWIND CSS USAGE IN PROJECT  
------------------------------------------------------------

Below is inferred Tailwind-style usage based on the aesthetics:

Color utilities  
• text-gray-800, text-gray-700, text-gray-500  
• bg-gray-50, bg-gray-100  
• bg-white  
• text-blue-600, bg-blue-600  

Spacing utilities  
• p-4, p-6, p-8  
• py-2, px-4 for buttons  
• gap-4, gap-6  
• mt-8, mt-12, mt-16 for large sections  

Typography utilities  
• text-xl, text-2xl, text-5xl for marketing  
• font-semibold, font-medium  
• leading-relaxed  

Borders & radius  
• rounded-lg  
• border border-gray-200  

Shadows  
• shadow-sm  
• shadow-md with reduced opacity in custom config  

Gradients  
• Hero gradient: `.gradient-purple` class (very subtle Mercury-style)  
• Custom implementation: `from-[#FBFCFF] via-[#F9FAFE] to-[#F4E8FB]`  
• Section backgrounds: subtle `from-[#F9FAFB] to-[#EEF4FF]` for separation  

Transitions  
• transition-all duration-150 ease-out  

------------------------------------------------------------
EXAMPLE COMPONENT REFERENCE DESIGN CODE  
(TailwindCSS)
------------------------------------------------------------

Example: Primary Button  
```tsx
<button
  class="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg 
         shadow-sm hover:bg-blue-500 transition-all duration-150"
>
  Open Account
</button>
```

Example: Card Component  
```tsx
<div
  class="bg-white rounded-xl border border-gray-200 shadow-md p-6 
         flex flex-col gap-4"
>
  <h2 class="text-lg font-semibold text-gray-900">
    Mercury balance
  </h2>
  <p class="text-3xl font-bold">$0.00</p>
</div>
```

Example: Marketing Hero Title  
```tsx
<h1 class="text-6xl font-bold leading-tight text-gray-900">
  Powerful banking.<br />
  Simplified finances.
</h1>
```

------------------------------------------------------------
ADDITIONAL OBSERVATIONS  
------------------------------------------------------------

• Overall theme emphasizes calmness, trust, and financial clarity.  
• UI avoids harsh colors; nearly everything feels "soft."  
• Sharpness is minimized; curves and soft borders dominate.  
• The system is highly scalable and modular — ideal for SaaS dashboards.  
• Typographic hierarchy is the foundation of the style system.  

------------------------------------------------------------
CURRENT IMPLEMENTATION NOTES
------------------------------------------------------------

**Color System (Updated for Better Readability)**
• Text colors have been darkened for improved readability in B2B context
• Foreground: #1F2937 (darker than original #2D2F36)
• Muted foreground: #374151 (darker than original #6F7287)
• All colors defined as CSS variables in `src/styles/globals.css` using TailwindCSS v4 `@theme` syntax

**Hero Gradient Implementation**
• Mercury-style very subtle gradient
• Implemented as `.gradient-purple` CSS class
• Gradient is almost imperceptible - provides depth without distraction
• Text sits directly on gradient (no card wrapper) for clean, minimal look

**Font Implementation**
• Using Inter font family (loaded via Next.js font optimization)
• Defined in `src/app/layout.tsx` with `--font-inter` CSS variable
• Applied globally via `src/styles/globals.css` in `@theme` block

**Component Library**
• Using shadcn/ui components (Button, Card, Input, Tabs)
• Components styled to match design system
• Custom utilities: `.shadow-soft`, `.shadow-soft-md`, `.text-hero`, `.text-section-title`, `.text-card-title`

**File Locations**
• Global styles: `src/styles/globals.css`
• Components: `src/components/ui/`
• Landing page: `src/app/page.tsx`
• Configuration: `components.json` (shadcn/ui)

------------------------------------------------------------
