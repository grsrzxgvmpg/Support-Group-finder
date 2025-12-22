# iOS Design Guidelines - Support Group Finder

This document outlines how the Support Group Finder PWA follows Apple's latest Human Interface Guidelines (iOS 18+) and iOS design principles.

## Overview

The Support Group Finder app is optimized for iOS with:
- **iOS 18+ Design System**: Modern visual design patterns
- **Safe Area Support**: Notch and Dynamic Island compatibility
- **Haptic Feedback**: Tactile feedback for user interactions
- **Dark Mode**: Dynamic color scheme support
- **Accessibility**: Full VoiceOver and keyboard navigation support

---

## Design System Alignment

### iOS 18+ Visual Design Principles

The app implements Apple's latest design philosophy:

#### 1. **San Francisco Typography**
```
Font Family: -apple-system, BlinkMacSystemFont
Fallbacks: Segoe UI, Roboto, Helvetica, Arial
```
- Uses system font for native feel
- Consistent with iOS native apps
- Optimized for readability on all device sizes

#### 2. **Glass Morphism (iOS 18+)**
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.30);
}
```
- Blurred translucent panels (iOS 18+ design trend)
- Creates depth and visual hierarchy
- Works seamlessly with dynamic wallpapers

#### 3. **Color Scheme**
```
Primary: #0D9488 (Teal) - Healthcare/wellness association
Background: #F2F2F7 (iOS Light Gray) - System consistency
Dark Mode: #000000 background, #FFFFFF text
```
- Teal color chosen for mental health/support context
- Automatically adapts to dark mode
- Meets WCAG AA contrast requirements

### Safe Area Support (Notch/Dynamic Island)

#### Implementation
```html
<meta name="viewport-fit" content="cover" />
```

#### CSS Implementation
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

**How it works:**
- Automatically adjusts padding for notch/Dynamic Island
- Ensures content never flows behind device features
- Updates on orientation changes
- Supports all iPhone models (iPhone 13+)

**Affected Devices:**
- iPhone 14/15/16 Series: Notch adaptation
- iPhone 14/15/16 Pro: Dynamic Island support
- iPhone X/11/12/13: Notch compatibility
- iPad Pro (6th gen+): Dynamic Island on iPad

### Haptic Feedback Integration

#### Purpose
Provides tactile feedback to enhance user interaction experience without audio cues.

#### Implementation
```typescript
triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error')
```

#### Feedback Types Used

| Type | Pattern | Use Case |
|------|---------|----------|
| **medium** | 20ms vibration | Search initiation |
| **success** | Short-gap-short pattern | Results found |
| **warning** | Long-gap-long pattern | No results/empty state |
| **error** | Multiple pulses | Network/API errors |
| **light** | 10ms vibration | Button interactions |

#### Accessibility
- Haptic feedback supplements visual feedback (not replaces)
- Users can disable in iOS Settings
- Always paired with visual UI changes

### Dark Mode Support

#### Automatic Detection
```css
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000000;
    color: #FFFFFF;
  }
  .glass-panel {
    background: rgba(0, 0, 0, 0.80);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
}
```

**User Control:**
- Respects iOS Settings > Display & Brightness
- Automatic switching based on time of day (if enabled)
- Per-app override not needed (uses system setting)

#### Color Adaptation Strategy
- Light mode: White backgrounds, dark text
- Dark mode: Black backgrounds, white text
- Accent colors (teal) remain consistent
- Glass panels adapt opacity for contrast

---

## Component Design Patterns

### Button Interactions

#### iOS-Style Active State
```css
button:active, a:active {
  opacity: 0.7;
  transform: scale(0.98);
}
```

**Behavior:**
- Scale down 2% on press (tactile feedback simulation)
- Opacity reduction indicates press state
- Instant visual response (no delay)
- Combined with haptic vibration

#### Focus Indicators (Accessibility)
```css
button:focus-visible {
  outline: 2px solid #0D9488;
  outline-offset: 2px;
}
```

### Modal Presentation

#### Design Pattern: Bottom Sheet
- Modals slide up from bottom (iOS standard)
- Semi-transparent backdrop (black/40%)
- Rounded corners (12-24px radius)
- Dismissible by swiping down or tap outside

#### Implementation
```tsx
<div className="slide-in-from-bottom-10 sm:zoom-in-95">
  {/* Modal content */}
</div>
```

### Touch Target Sizing

**Minimum Touch Target:** 44×44 points (iOS standard)
- All buttons and interactive elements
- Spacing between targets: 8 points minimum
- Larger targets on mobile: 48-56 points

---

## Installation & Home Screen Experience

### PWA Installation on iOS

#### Step-by-Step User Flow

**Method 1: Safari - Add to Home Screen (Recommended)**
```
1. Open in Safari
2. Tap Share button (↑ icon)
3. Scroll and tap "Add to Home Screen"
4. Confirm app name "Support Groups" (under 12 chars)
5. Tap "Add"
Result: App appears on home screen with custom icon
```

**Method 2: Home Screen Web App**
- Users can add directly to home screen
- Launches in full-screen standalone mode
- No Safari chrome/address bar
- Persistent app icon with custom colors

### App Metadata

#### Manifest Configuration
```json
{
  "name": "Support Group Finder",
  "short_name": "Support",
  "display": "minimal-ui",
  "theme_color": "#0D9488",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "purpose": "any"
    }
  ]
}
```

#### Icon Design
- **Size:** 192×192 PNG (minimum)
- **512×512 for splash screens**
- **Design:** Teal background (#0D9488) with white community icon
- **Safe Zone:** Content within 40px from edges
- **No transparency:** Solid background color

### Status Bar Styling

#### Configuration
```html
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

**Status Bar Behavior:**
- Light background: Dark text/icons
- Dark background: Light text/icons
- Automatic on iOS 18+ based on app colors

---

## Performance Optimization for iOS

### Load Time Targets
- **First Load:** < 2 seconds (over 4G)
- **Repeat Load:** < 0.5 seconds (service worker cache)
- **Time to Interactive:** < 1 second

### Data Usage
- **First Visit:** ~500KB (JS bundle + assets)
- **Repeat Visits:** ~10KB (only API calls)
- **Offline:** 0KB (cached entirely)

### Battery Optimization
- Service worker runs in background (iOS 16+)
- Update checks only on app focus
- Minimal network requests when offline
- Efficient CSS/JS execution

---

## Accessibility Features (WCAG 2.1 AA)

### Screen Reader Support (VoiceOver)

#### Semantic HTML
```tsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Dialog Title</h2>
  {/* Content */}
</div>
```

#### ARIA Implementation
- `aria-label`: Button purposes
- `aria-labelledby`: Heading associations
- `aria-live="polite"`: Dynamic updates
- `aria-current="page"`: Active pagination
- `role="dialog"`: Modal semantics

#### Keyboard Navigation
- Tab through interactive elements
- Escape to close modals
- Enter/Space to activate buttons
- Arrow keys for lists (when applicable)

### Color Contrast
- Text on background: 4.5:1 minimum (WCAG AA)
- UI components: 3:1 minimum
- Verified for both light and dark modes

### Text Sizing
- Supports system text size scaling
- Readable at 200% zoom level
- No horizontal scrolling needed

---

## Networking & Offline Support

### Network-First Strategy

#### API Caching
```
1. Try network request
2. If successful, update cache and return
3. If failed, return cached version (if exists)
4. If no cache, show offline message
```

**Cache Duration:**
- Search results: 12 hours
- External APIs: 24 hours
- Static assets: Until app update

### Offline Detection

#### Implementation
```typescript
useEffect(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}, []);
```

**User Feedback:**
- Offline banner: "You're offline..."
- Cached results still accessible
- Retry button on network errors
- Automatic recovery on reconnect

---

## Testing Checklist for iOS

### Before Deployment

#### Device Testing
- [ ] iPhone 14+ (current generation)
- [ ] iPhone 13 (previous gen)
- [ ] iPad Pro (notch handling)
- [ ] iOS 17 and iOS 18

#### Orientation Testing
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Orientation changes
- [ ] Safe area insets respect

#### Interaction Testing
- [ ] Search initiates haptic
- [ ] Results found produces success haptic
- [ ] Error states produce error haptic
- [ ] Button press animation smooth
- [ ] Modal dismissal works

#### Dark Mode Testing
- [ ] Automatic dark mode switch
- [ ] All text readable in dark mode
- [ ] Images/icons visible in dark mode
- [ ] Glass panels render correctly

#### Accessibility Testing
- [ ] VoiceOver: All interactive elements labeled
- [ ] VoiceOver: Logical reading order
- [ ] Keyboard: Tab navigation works
- [ ] Keyboard: Escape closes modals
- [ ] Colors: 4.5:1 contrast verified

#### Network Testing
- [ ] Works offline with cached data
- [ ] Shows offline message clearly
- [ ] Retry button functions
- [ ] Automatic reconnect works
- [ ] Service worker updates

#### Performance Testing
- [ ] First load < 2 seconds
- [ ] Repeat load < 0.5 seconds
- [ ] No jank during scrolling
- [ ] Animations smooth (60 FPS)

---

## Best Practices

### Do's ✅
- Use system fonts (San Francisco)
- Respect safe area insets
- Provide haptic feedback for actions
- Support both light and dark modes
- Keep buttons 44×44pt minimum
- Use native iOS modal animations
- Test on real devices
- Support landscape orientation

### Don'ts ❌
- Don't disable zoom (allow pinch to zoom)
- Don't create fake iOS UI (looks like web)
- Don't use non-standard keyboard shortcuts
- Don't ignore safe areas
- Don't force light mode only
- Don't make buttons smaller than 44pt
- Don't use haptics as only feedback
- Don't disable orientation support

---

## Deployment Checklist

Before going live on iOS:

1. **Icons**
   - [ ] 192×192 PNG created
   - [ ] 512×512 PNG created
   - [ ] Maskable variant included
   - [ ] Test on home screen

2. **Manifest**
   - [ ] Valid JSON
   - [ ] short_name < 12 characters
   - [ ] All required fields present
   - [ ] Icons properly referenced

3. **Meta Tags**
   - [ ] apple-mobile-web-app-capable
   - [ ] apple-mobile-web-app-title
   - [ ] color-scheme meta tag
   - [ ] theme-color for light/dark

4. **SSL Certificate**
   - [ ] HTTPS enabled
   - [ ] Valid certificate
   - [ ] Automatic redirects HTTP → HTTPS

5. **Service Worker**
   - [ ] Registers successfully
   - [ ] Caching works offline
   - [ ] Updates detected

6. **Testing**
   - [ ] All checkboxes above completed
   - [ ] Manual testing on 2+ devices
   - [ ] Safari DevTools verified

---

## Resources

### Apple Documentation
- [Human Interface Guidelines - iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Web Apps on iOS](https://developer.apple.com/tutorials/app-clips)
- [Safari Web Apps](https://webkit.org/status/#specification-webkit-app-region)
- [Dark Mode Support](https://developer.apple.com/documentation/xcode/supporting_dark_mode_in_your_web_content)

### Implementation References
- [env() CSS Function](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

### Tools
- [Simulator](https://developer.apple.com/simulator/) - Test without device
- [Safari DevTools](https://webkit.org/web-inspector/) - Remote debugging
- [Lighthouse](https://web.dev/lighthouse/) - Performance auditing
- [WAVE](https://wave.webaim.org/) - Accessibility testing

---

## Support

For questions about iOS design implementation:
1. Check Apple's HIG for the latest patterns
2. Test on actual iOS devices when possible
3. Use Safari DevTools for debugging
4. Validate with accessibility tools (WAVE, Lighthouse)

**Current iOS Support:** iOS 15 and later
**Optimized for:** iOS 17 and iOS 18
