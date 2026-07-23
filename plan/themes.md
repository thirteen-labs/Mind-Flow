# Theme System

## Architecture

Themes are defined as JSON-like objects with color tokens. A React context provides the active theme to all components.

```typescript
interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    card: string;
    error: string;
    success: string;
    warning: string;
    notification: string;
    tint: string;
    tabActive: string;
    tabInactive: string;
    // ... platform-specific
    ios?: { blurStyle: string };
    android?: { elevation: number };
  };
  typography: {
    fontFamily: string;
    heading: string;
    body: string;
    mono: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number; full: number };
  isDark: boolean;
}
```

## Theme Definitions

### 1. Midnight
Dark theme. OLED-friendly deep black background. Blue accent. Glass morphism.
```json
{ "background": "#000000", "surface": "#111111", "text": "#FFFFFF", "primary": "#208AEF" }
```

### 2. Paper Journal
Light theme. Cream paper, warm brown ink. Vintage book aesthetic.
```json
{ "background": "#F5F0E8", "surface": "#EDE5D8", "text": "#3D3028", "primary": "#8B6914" }
```

### 3. Aurora
Dark theme. Deep purple base with blue/green gradient accents. Modern glass.
```json
{ "background": "#0D0A1A", "surface": "#1A1533", "text": "#E8E4F0", "primary": "#7C3AED" }
```

### 4. Forest
Dark theme. Dark green, earthy, calm tones.
```json
{ "background": "#0D1A12", "surface": "#15281C", "text": "#D4E8D4", "primary": "#2D8A4E" }
```

### 5. Ocean
Light theme. Clean blue and teal. Minimal and airy.
```json
{ "background": "#F0F8FF", "surface": "#E6F2FA", "text": "#1A2B3C", "primary": "#0A84C1" }
```

### 6. Sunset
Light theme. Warm orange and pink tones.
```json
{ "background": "#FFF5EE", "surface": "#FFEEE5", "text": "#3D2A1A", "primary": "#E85D3A" }
```

### 7. Cyberpunk
Dark theme. Black base, neon purple, electric blue accents.
```json
{ "background": "#0A0A0F", "surface": "#14141F", "text": "#E0E0FF", "primary": "#D946EF" }
```

### 8. Moonlight
Dark theme. Dark gray base, silver accents. Minimal dark.
```json
{ "background": "#1C1C1E", "surface": "#2C2C2E", "text": "#F5F5F5", "primary": "#A0A0A5" }
```

## Theme Storage

- Active theme stored in MMKV
- Themes defined as constants in `src/constants/themes.ts`
- User preference persisted across sessions
- System `userInterfaceStyle` set to `automatic` in app.json for light/dark switching
