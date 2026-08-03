---
name: CineCircle Noir
colors:
  surface: '#10131f'
  surface-dim: '#10131f'
  surface-bright: '#363946'
  surface-container-lowest: '#0b0e1a'
  surface-container-low: '#181b27'
  surface-container: '#1c1f2c'
  surface-container-high: '#272936'
  surface-container-highest: '#313442'
  on-surface: '#e0e1f3'
  on-surface-variant: '#e4bdba'
  inverse-surface: '#e0e1f3'
  inverse-on-surface: '#2d303d'
  outline: '#ab8885'
  outline-variant: '#5b403d'
  surface-tint: '#ffb3ad'
  primary: '#ffb3ad'
  on-primary: '#680008'
  primary-container: '#ff544e'
  on-primary-container: '#5c0006'
  inverse-primary: '#bb161f'
  secondary: '#b5c4ff'
  on-secondary: '#00297b'
  secondary-container: '#234193'
  on-secondary-container: '#9cb2ff'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#909191'
  on-tertiary-container: '#282a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#930010'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b5c4ff'
  on-secondary-fixed: '#00164d'
  on-secondary-fixed-variant: '#234193'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#10131f'
  on-background: '#e0e1f3'
  surface-variant: '#313442'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 24px
  gutter: 16px
  card-gap: 20px
  section-padding: 40px
---

## Brand & Style
The design system for this product is rooted in a **Modern Cinematic** aesthetic, designed to evoke the immersive, high-stakes feeling of a premium theater experience. The target audience consists of film enthusiasts and social cinephiles who value both visual spectacle and community interaction.

The style leverages **Glassmorphism** and **Corporate Modern** influences to create a "Noir" digital environment. Key characteristics include:
- **Depth through Translucency:** Using backdrop blurs to simulate layers of glass over moving imagery or subtle patterns.
- **Pattern Motifs:** Subtle, low-opacity web-pattern overlays (2-4% opacity) integrated into the deepest background layers to provide texture without distraction.
- **Premium Focus:** High-contrast focal points against deep, expansive backgrounds to mimic a screen in a darkened theater.

## Colors
The palette is dominated by deep, nocturnal tones to maintain a cinematic atmosphere, with high-energy accents for user interaction.

- **Primary (#e23636):** "Spider-Man Red." Reserved exclusively for primary Calls to Action (CTAs), critical alerts, and active states. It should vibrate against the dark background.
- **Secondary (#1b3a8c):** "Deep Blue." Used for supportive interactive elements, progress bars, and subtle brand reinforcement in iconography.
- **Background (#0b0e1a):** "Dark Navy." The foundation of the UI. All surfaces stem from this hue to ensure perfect black-level harmony.
- **Surface/Neutral:** Greyscale is avoided in favor of "Cool Greys" (e.g., #f2f2f7) for text to maintain the blue-tinted depth of the navy environment.

## Typography
The typography strategy balances high-impact headlines with hyper-legible utility text. 

**Plus Jakarta Sans** is utilized for headings to provide a modern, slightly rounded, and premium feel that complements the card shapes. **Inter** is the workhorse for all body copy and labels, ensuring maximum readability during long-form reviews or social browsing. 

For a cinematic effect, use `uppercase` with increased letter spacing for `label-sm` elements when they appear as "Overlines" or "Categories."

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous internal safe areas. 

- **Desktop:** 12-column grid with 24px gutters. Content is typically housed in centralized containers to prevent extreme eye-scanning.
- **Mobile:** 4-column grid with 16px gutters and 24px side margins to allow the UI to breathe.
- **Spacing Rhythm:** Based on an 8px root. Use 20px (2.5x) for gaps between cards to maintain a distinct "floating" feel. Vertical section spacing should be aggressive (40px+) to emphasize the premium, uncrowded nature of the design system.

## Elevation & Depth
Depth is not achieved through traditional heavy shadows, but through **Tonal Layering** and **Luminance**.

1.  **Level 0 (Base):** Dark Navy (#0b0e1a).
2.  **Level 1 (Cards/Surfaces):** A slightly lighter navy (#161b30) with a 1px inner border of 10% white to define edges.
3.  **Level 2 (Overlays/Modals):** Use 60% opacity of the surface color with a 20px **Backdrop Blur**. 

Shadows, when used, should be "Ambient Glows" rather than "Drop Shadows"—specifically, a soft red glow (#e23636 at 20% opacity) behind primary buttons to simulate light emanating from a screen.

## Shapes
The shape language is defined by **large, friendly radii**. 

Standard UI components use a 16px radius (`rounded-lg` in this design system). This softness contrasts with the "dark" theme to make the social experience feel welcoming rather than cold or technical. 
- **Buttons:** Fully rounded (pill-shaped) to distinguish them from content cards.
- **Media Containers:** 16px or 24px radius to frame movie posters and trailers elegantly.

## Components
- **Buttons:** Primary buttons use the Spider-Man Red fill with white semi-bold text. Secondary buttons use a transparent background with a 1.5px Deep Blue border.
- **Cards:** Content cards must feature a subtle gradient overlay at the bottom to ensure white text is legible over movie posters. Use a 1px "ghost border" (White @ 10%) for definition.
- **Chips:** Used for genres or tags. These should have a Deep Blue background at 20% opacity and a 1px solid Deep Blue border.
- **Input Fields:** Darker than the card surface, using a 1px border that glows Red (#e23636) on focus.
- **Progress Bars:** Use Deep Blue for the track and Spider-Man Red for the active progress to signify "energy" or "completion."
- **Movie Reels (Custom Component):** A horizontal scrolling list of posters with high-contrast scaling—the centered poster should be 10% larger than its neighbors.