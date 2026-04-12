# Video Editor Node

The Video Editor node allows you to trim videos directly within the OpenFilm canvas. It provides a timeline-based interface for selecting start and end points, and exports the trimmed video to your library for use in further video generation workflows.

## Features

- **Timeline-based trimming**: Drag start (green) and end (red) handles to select the portion of video to keep
- **Real-time preview**: Play the video and see the selected range in context
- **Export to Library**: Trimmed videos are saved as new files, preserving the original
- **Seamless integration**: Connect to Video nodes for input, and use output for further generation

## How to Use

### 1. Add a Video Editor Node

Right-click on the canvas → **Add Nodes** → **Video Editor**

A Video Editor node will appear on the canvas with a placeholder message.

### 2. Connect a Video Source

Drag a connection from a **Video** node to the Video Editor node. The Video Editor will display the connected video's thumbnail.

**Supported connections:**
| From | To | Allowed |
|------|-----|---------|
| Video | Video Editor | ✅ Yes |
| Video Editor | Video | ✅ Yes |
| Image | Video Editor | ❌ No |
| Video Editor | Video Editor | ❌ No |

### 3. Open the Editor

Double-click the Video Editor node to open the full-screen editor modal.

### 4. Trim the Video

The editor provides:

- **Video Preview**: The video player showing the connected video
- **Playback Controls**: Play/Pause, Skip to Start, Skip to End buttons
- **Timeline Bar**: Visual representation of the video duration
  - **Green handle** (left): Drag to set trim start point
  - **Red handle** (right): Drag to set trim end point  
  - **White playhead**: Shows current playback position
- **Time Display**: Shows Start, Current, and End timestamps
- **Duration Indicator**: Shows the length of the selected segment

### 5. Export to Library

Click **"Export to Library"** to:
1. Trim the video using FFmpeg
2. Save the trimmed video to `library/videos/`
3. Create metadata so it appears in the History panel
4. Update the node with the trimmed video URL

The Video Editor node will now display the trimmed video and can be connected to other Video nodes for generation.

## Technical Details

### Node Properties

The Video Editor node stores these additional properties:

```typescript
{
  trimStart?: number;  // Trim start time in seconds
  trimEnd?: number;    // Trim end time in seconds
  resultUrl?: string;  // URL to the exported trimmed video
}
```

### Server Endpoint

**POST `/api/trim-video`**

Request body:
```json
{
  "videoUrl": "/library/videos/source.mp4",
  "startTime": 2.5,
  "endTime": 8.0,
  "nodeId": "node-123"
}
```

Response:
```json
{
  "success": true,
  "url": "/library/videos/trimmed_1234567890_abc1.mp4",
  "filename": "trimmed_1234567890_abc1.mp4",
  "duration": 5.5
}
```

### Requirements

- **FFmpeg** must be installed on the server for video trimming to work
  - Windows: `winget install ffmpeg`
  - Mac: `brew install ffmpeg`
  - Linux: `apt install ffmpeg`

### File Structure

```
src/
├── components/
│   └── modals/
│       └── VideoEditorModal.tsx    # Editor UI with timeline
├── hooks/
│   └── useVideoEditor.ts           # Modal state and export logic
└── types.ts                        # VIDEO_EDITOR enum and trim properties

server/
└── index.js                        # /api/trim-video endpoint
```

## Workflow Example

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Video     │────▶│ Video Editor │────▶│   Video     │
│  (Source)   │     │  (Trimmed)   │     │ (Generate)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

1. Generate or import a video
2. Connect to Video Editor
3. Trim to desired segment
4. Export to library
5. Connect trimmed output to another Video node for further generation (e.g., extend, remix)

## Troubleshooting

### "FFmpeg is not installed" error
Install FFmpeg on your system and restart the server.

### Trimmed video not appearing in library
- Check the server console for errors
- Ensure the source video exists in `library/videos/`
- Verify FFmpeg is working: run `ffmpeg -version` in terminal

### Timeline controls not showing
- Wait for the video metadata to load (may take a moment for large videos)
- Check browser console for JavaScript errors
