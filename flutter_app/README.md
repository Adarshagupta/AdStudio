# Ad Studio Flutter App

A Flutter mobile application for the UGC Ad Platform - AI-powered ad and short-video generation for marketing teams.

## Features

- **Authentication**: Login, Signup, Forgot Password, Session Management
- **Dashboard**: AI Chat Interface with generation history
- **Studio Pro**: Visual node editor (coming in next update)
- **Generations**: View all generated images/videos with status tracking
- **Settings**: Profile management, workspace settings, billing
- **Real-time**: WebSocket support for live collaboration
- **Media**: Image/Video upload, playback, download

## Architecture

```
lib/
├── core/              # Theme, Router, Constants
├── features/          # Feature folders
│   ├── auth/
│   ├── dashboard/
│   ├── studio/
│   ├── generations/
│   └── settings/
├── models/            # Data models
├── providers/         # State management (Provider)
├── screens/           # UI screens
├── services/          # API services
├── utils/             # Utilities
└── widgets/           # Reusable widgets
```

## Tech Stack

- **Framework**: Flutter 3.x
- **State Management**: Provider
- **Navigation**: Go Router
- **HTTP Client**: Dio
- **WebSocket**: web_socket_channel
- **Image/Video**: image_picker, video_player
- **Storage**: shared_preferences

## Setup

1. Install Flutter dependencies:
```bash
flutter pub get
```

2. Run the app:
```bash
flutter run
```

## API Configuration

The app connects to the production API at:
```
https://ugc-ad-platform.vercel.app/api
```

Authentication is handled via session cookies stored in SharedPreferences.

## Key Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Signup
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/auth/me` - Current user

### Generations
- `POST /api/generate` - Start generation
- `GET /api/generate/:jobId/status` - Poll status
- `GET /api/generations` - List generations
- `GET /api/generations/:id` - Get generation

### Chat
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions` - List sessions
- `GET /api/chat/sessions/:id` - Get messages
- `POST /api/chat/sessions/:id/messages` - Send message

### Studio
- `POST /api/studio/flows` - Create flow
- `GET /api/studio/flows` - List flows
- `GET /api/studio/flows/:id` - Get flow
- `PATCH /api/studio/flows/:id` - Update flow

### Assets
- `POST /api/studio/upload` - Upload asset
- `GET /api/assets` - List assets
- `GET /api/avatars` - List avatars

## Environment Variables

Create a `.env` file:
```
API_BASE_URL=https://ugc-ad-platform.vercel.app/api
```

## Platform Support

- iOS 12+
- Android API 21+
- Web (Chrome, Safari, Firefox)

## License

Proprietary - Ad Studio Platform
