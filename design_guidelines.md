# Bot Management Dashboard - Design Guidelines

## Design Approach: Productivity-Focused System
**Selected System**: Linear/Vercel Design Language - Modern, clean productivity aesthetic optimized for data-dense applications with efficient workflows.

**Justification**: This is a utility-focused dashboard requiring clear information hierarchy, efficient task management, and minimal visual distractions. The interface prioritizes functionality over aesthetics while maintaining modern polish.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary Theme)**
- Background Primary: 8 8% 7% (deep charcoal)
- Background Secondary: 215 25% 12% (card/panel background)
- Background Tertiary: 215 20% 18% (input fields, hover states)
- Border Default: 215 15% 25%
- Border Subtle: 215 10% 20%

**Brand & Status Colors**
- Primary (Actions): 221 83% 53% (vibrant blue)
- Success: 142 76% 36% (forest green)
- Warning: 38 92% 50% (amber)
- Error: 0 84% 60% (crimson)
- Info: 262 83% 58% (purple)
- Accent: 189 94% 43% (cyan)

**Text Colors**
- Text Primary: 210 20% 98%
- Text Secondary: 215 16% 65%
- Text Muted: 215 12% 45%

### B. Typography
**Font Family**: Inter (via Google Fonts CDN)
**Monospace**: 'Fira Code' or 'Monaco' for bot tokens/IDs

**Scale**:
- Headings: 600-700 weight, sizes 24px (h1), 18px (h2), 16px (h3)
- Body: 400-500 weight, 14px base, 16px for primary content
- Labels: 500 weight, 12px, uppercase with letter-spacing
- Code/Data: 400 weight, 13px monospace

### C. Layout System
**Sidebar + Main Content Grid**

**Spacing Primitives**: Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16
- Micro spacing: p-2, gap-1 (buttons, badges)
- Component spacing: p-4, p-6 (cards, panels)
- Section spacing: p-8, p-12, gap-8 (main layout areas)
- Macro spacing: mt-16, mb-20 (major sections)

**Layout Structure**:
- Sidebar: Fixed 240px width on desktop, collapsible on mobile
- Main content: max-w-7xl with responsive padding (px-4 md:px-8)
- Cards: Full-width stacked on mobile, grid on desktop (2-3 columns)
- Grid gaps: gap-4 for cards, gap-6 for major sections

### D. Component Library

**Sidebar Navigation**
- Fixed left panel, dark background (Background Secondary)
- Logo/branding at top (h-16)
- Navigation items with icons (Heroicons), 40px height
- Active state: Primary color left border (3px), subtle background
- Hover state: Background Tertiary
- Collapsible on mobile with hamburger icon

**Cards/Panels**
- Background Secondary with 1px Border Default
- Rounded corners: 12px
- Padding: p-6
- Header with icon (36px circle, colored background at 20% opacity) + title
- Divider below header: 1px Border Subtle

**Buttons**
- Height: 40px (h-10), padding px-4
- Primary: Primary color background, white text
- Secondary: Background Tertiary, Text Primary
- Success/Warning/Error: Respective color backgrounds
- Rounded: 8px
- Font weight: 500
- Icon + text layout with gap-2
- Disabled: 50% opacity

**Input Fields**
- Background Tertiary with Border Default
- Height: 40px, padding px-3
- Rounded: 6px
- Focus state: Primary color border, subtle shadow (0 0 0 3px at 10% opacity)
- Label: Text Secondary, 12px, uppercase, mb-2

**Status Badges**
- Small pill shape (rounded-full), px-2 py-1
- Font size: 11px, weight 600, uppercase
- Background at 20% opacity of status color
- Text in full saturation status color
- Types: Member (Success), Non-member (Error), Checking (Accent), Connected (Info), Joining (Warning)

**Stats Display**
- Grid of stat boxes (2-4 columns responsive)
- Background Tertiary, rounded 8px, p-4
- Large number: 24px, 700 weight, colored by status
- Label: 11px, Text Muted, uppercase

**Bot Lists**
- Scrollable container (max-h-80), Background Primary
- Individual items: 36px height, px-3, rounded 6px
- Left border indicator (3px) with status color
- Monospace font for bot names
- Status badge on right
- Hover: Background Tertiary

**Progress Bars**
- Height: 6px, Background Tertiary
- Fill: Gradient from Primary to Accent
- Rounded: 3px
- Smooth transition (0.3s)

### E. Animation & Interactions
**Minimal Approach** - Only functional feedback:
- Button hover: subtle lift (translateY(-1px))
- Sidebar items: 150ms background color transition
- Progress bars: 300ms width transition
- Tab/panel switching: No animation (instant)
- Loading states: Subtle pulse on relevant stat numbers

## Page Structure

**Sidebar (Fixed Left)**
1. Dashboard header with icon
2. Navigation menu items:
   - Messages Task
   - Mic Task
   - Name Change
   - Bot Loader
   - Membership Check
3. Footer: Status indicator or settings icon

**Main Content Area**
1. Page header: Title + description (mb-8)
2. Action panel: Primary controls card (start/stop buttons, key inputs)
3. Stats grid: 2-3 column responsive grid showing progress metrics
4. Results panel: Bot list with status indicators
5. Bottom spacing: pb-16

**Responsive Breakpoints**:
- Mobile (<768px): Sidebar collapses to overlay, cards stack
- Tablet (768-1024px): Sidebar visible, 2-column grids
- Desktop (>1024px): Full layout, 3-column grids where appropriate

## Key Principles
1. **Information Density**: Maximize useful data without clutter
2. **Visual Hierarchy**: Size, color, and spacing denote importance
3. **Consistent Patterns**: Reuse components across all task modules
4. **Efficient Workflows**: Minimize clicks, clear CTAs
5. **Dark Mode Excellence**: Proper contrast ratios, no pure black/white
6. **Status Clarity**: Color-coded feedback for all bot states

## No Images Required
This is a utility dashboard - no hero images or decorative photography needed. Icons (Heroicons or Font Awesome via CDN) provide sufficient visual interest.