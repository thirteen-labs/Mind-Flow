# Architecture

## Overview

MindFlow is an Expo (React Native) application targeting iOS, Android, and Web with a shared TypeScript codebase.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│           UI Layer (Screens)            │
│  Writer · Planner · Calendar · Search   │
│  Library · Settings · Insights · Export │
├─────────────────────────────────────────┤
│        Component Layer (Reusable)       │
│  ThemedText · ThemedView · Cards        │
│  Toolbar · Canvas · Timeline · Editor   │
├─────────────────────────────────────────┤
│         State & Data Layer              │
│  React Context · SQLite · MMKV          │
│  File System · Hooks                    │
├─────────────────────────────────────────┤
│          Expo / Native APIs             │
│  Router · Haptics · Audio · Video       │
│  Image · Notifications · Sharing        │
└─────────────────────────────────────────┘
```

## Key Design Decisions

- **File-based routing** via Expo Router with typed routes
- **Offline-first**: SQLite for structured data, filesystem for media
- **Native UI** via `@expo/ui` where possible for platform-native feel
- **Theme system** with CSS variables / React context — 8 themes
- **Canvas/Planner** uses React Native Skia for performant 2D rendering
- **Writer** uses a rich text / markdown editor with persistent storage

## Platform Targets

| Platform | Build | Notes |
|----------|-------|-------|
| iOS      | EAS Build | Native modules, SwiftUI via @expo/ui |
| Android  | EAS Build | Jetpack Compose via @expo/ui |
| Web      | Static export | React Native Web, basic functionality |
