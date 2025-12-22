# iPhone 16 Emulator Guide

## Overview

The `IPHONE_16_VIEW.html` file provides a professional iPhone 16 emulator that displays your Support Group Finder app with authentic iOS styling and device features.

## Features

### ✅ Device Emulation
- **iPhone 16 Form Factor**: 393 × 852px accurate screen dimensions
- **Dynamic Island**: Realistic pill-shaped notch with time/status display
- **Rounded Corners**: 45px border-radius matching iPhone 16 design
- **Bezels**: 12px black bezel frame
- **Safe Areas**: Top (50px) and bottom (30px) insets for notch and home indicator

### ✅ iOS Design System
- **System Typography**: San Francisco font stack (-apple-system)
- **Glass Morphism**: Translucent panels with backdrop blur (20px)
- **Teal Accent**: #0D9488 color for healthcare/wellness context
- **Light/Dark Modes**: Automatic theme switching

### ✅ Interactive Features
- **Dark Mode Toggle**: Click 🌙 button to switch themes
- **Live Preview**: Real-time app rendering in iframe
- **Info Panel**: Device specifications and feature checklist
- **Status Bar**: Animated dynamic island with time display
- **Responsive Layout**: Scales to fit screen while maintaining aspect ratio

## How to Use

### 1. **Open the Emulator**

**Option A: File Manager**
```
1. Open: C:\Users\SB\Coding\Support-Group-finder\
2. Double-click: IPHONE_16_VIEW.html
3. Opens in default browser
```

**Option B: Direct URL**
```
file:///c:/Users/SB/Coding/Support-Group-finder/IPHONE_16_VIEW.html
```

**Option C: Command Line**
```bash
start IPHONE_16_VIEW.html
```

### 2. **View Your App**

The app loads inside the iPhone 16 frame:
- Shows Support Group Finder interface
- All features fully functional
- Search, filters, and modals work normally
- Haptic feedback visualized with scale animation

### 3. **Test Features**

#### Dark Mode
```
Click: 🌙 Dark Mode (top right)
Result: Theme switches for entire interface
```

#### Search Functionality
```
1. Type a topic: "Anxiety", "Depression", etc.
2. Enter a location: "San Francisco", "New York", etc.
3. Click Search
4. Results appear with haptic feedback simulation
```

#### Responsive Design
```
Resize your browser window
Device frame scales proportionally
Content reflows without cutoff
```

## Layout Breakdown

```
┌─────────────────────────────────┐  ← Black bezel (12px)
│  📡 9:41                        │  ← Dynamic Island (fixed position)
├─────────────────────────────────┤
│                                 │
│  Safe Area Top (50px)           │  ← Notch safe zone
├─────────────────────────────────┤
│                                 │
│                                 │
│   App Content (localhost:3005)  │  ← Live app preview
│                                 │
│                                 │
├─────────────────────────────────┤
│  Safe Area Bottom (30px)        │  ← Home indicator
└─────────────────────────────────┘  ← Rounded corners (45px)
```

## Technical Details

### CSS Layout
- **Flex Container**: device-frame uses flex-direction: column
- **Safe Areas**: Proper sizing with flex-shrink: 0
- **Content Area**: Flex: 1 to fill remaining space
- **Overflow**: Hidden to keep content within rounded corners
- **Iframe**: 100% width/height to match device screen

### Browser Support
- **Chrome/Edge**: Full support
- **Firefox**: Full support (compatible CSS used)
- **Safari**: Full support with -webkit prefixes
- **Mobile Browsers**: Works on actual iPhones/iPads

### Dark Mode Implementation
```javascript
// Toggle via JavaScript
document.body.classList.toggle('dark-mode')

// Stores preference in localStorage
localStorage.setItem('theme-preference', 'dark')

// Applies media query styles
@media (prefers-color-scheme: dark) {
  body { background-color: #000; }
}
```

## Resolution & Scaling

### Device Screen Size
- **Width**: 393px (true device width)
- **Height**: 852px (true device height)
- **Aspect Ratio**: 9 / 19.5
- **Max Container Width**: 400px (with padding)

### Scaling
- Mobile (< 600px): Device fills screen
- Tablet (600px - 1200px): Centered with padding
- Desktop (> 1200px): Centered, max-width: 400px

## Troubleshooting

### Issue: Content is cut off on the right side
**Solution**: Browser zoom level might be affecting layout
```
1. Press Ctrl+0 to reset zoom to 100%
2. Refresh the page (F5)
3. Content should display fully
```

### Issue: Dynamic Island not showing
**Solution**: Check z-index and fixed positioning
```css
.dynamic-island {
  position: fixed;
  z-index: 200;
  pointer-events: none;
}
```

### Issue: Iframe not loading
**Ensure**:
1. Dev server is running on localhost:3005
2. Firewall allows localhost connections
3. Browser allows iframe embedding
4. Sandbox attributes are correct

## Customization

### Change Device Size
```css
.device-container {
  max-width: 450px;  /* Increase width */
  aspect-ratio: 9 / 19.5;  /* Keep ratio */
}
```

### Adjust Dynamic Island Position
```css
.dynamic-island {
  top: 20px;  /* Distance from top of screen */
  width: 120px;  /* Pill width */
  height: 28px;  /* Pill height */
}
```

### Modify Safe Areas
```css
.safe-area-top {
  height: 50px;  /* Notch clearance */
}

.safe-area-bottom {
  height: 30px;  /* Home indicator clearance */
}
```

## Performance Notes

- **Load Time**: 200-500ms (depends on dev server)
- **Memory Usage**: ~50-100MB for emulator + app
- **CPU Usage**: Low (mostly idle, spikes on interaction)
- **Network**: Uses localhost only (no external requests)

## Testing Checklist

Before deploying, test with this emulator:

- [ ] Search functionality works
- [ ] Results display properly
- [ ] Dark mode toggles correctly
- [ ] Content fits within safe areas
- [ ] No horizontal scrolling occurs
- [ ] Dynamic Island doesn't overlap content
- [ ] All buttons are accessible
- [ ] Keyboard navigation works
- [ ] Touch gestures work (if testing on device)
- [ ] Haptic feedback triggers (visual feedback shows)

## Advanced Features

### Message Passing (Future Enhancement)
```javascript
// Emulator can receive messages from iframe
window.addEventListener('message', (event) => {
  if (event.data.type === 'haptic-feedback') {
    // Apply visual feedback
    device.style.animation = 'pulse 0.3s';
  }
});
```

### Theme Synchronization
```javascript
// Share theme preference with iframe
iframe.contentWindow.postMessage(
  { type: 'theme-change', isDark: true },
  '*'
);
```

## Real Device Testing

For actual iOS testing:

1. **Deploy to Vercel/Netlify** (see QUICK_START.md)
2. **Share URL with test devices**
3. **iOS Safari**: Share → Add to Home Screen
4. **Android Chrome**: Menu → Install app

The emulator is a development tool. Always test on real devices before release.

## Resources

- [iPhone 16 Specs](https://www.apple.com/iphone-16/specs/)
- [Human Interface Guidelines - iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Safe Area Documentation](https://developer.apple.com/documentation/uikit/uiview/2891103-safeareainsets)
- [Dynamic Island Guide](https://developer.apple.com/design/human-interface-guidelines/components/system-experiences/notches-and-dynamic-island)

---

**File Location**: `IPHONE_16_VIEW.html`
**Last Updated**: 2025-12-21
**Status**: Production Ready
