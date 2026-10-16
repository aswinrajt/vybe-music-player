# VYBE Music Player

Build a modern, responsive web music player called **VYBE**.

**Product vision:** A minimal music player that helps users discover music based on their mood and current activity. Its signature feature is “Surprise Me,” which recommends a random song suited to the user's selected context.

**Design**
- Premium dark and white  interface that can switch with charcoal backgrounds, subtle purple gradients, and clean typography.
- Inspired by modern music streaming apps, but with an original layout and identity.
- Responsive desktop and mobile layouts.
- Beautiful album artwork, rounded cards, subtle animations, and accessible contrast.

**Pages and components**
1. Home: greeting, prominent Surprise Me button, mood selection, activity selection, and recommended tracks.
2. Discover: browse and filter songs by mood, activity, and genre.
3. Library: favourites and recently played tracks.
4. Persistent bottom music player with artwork, track details, play/pause, next, previous, progress, volume, and queue controls.

**Core functionality**
- Use React, TypeScript, and reusable components.
- Implement actual audio playback using the HTMLAudioElement API.
- Maintain a single shared audio player across page navigation.
- Implement working seeking, volume, playback status, track changes, and error handling.
- Make Surprise Me select a suitable, playable track and avoid recently played tracks when possible.
- Mood options: Happy, Calm, Melancholy, Energetic, Focused, and Sleepy.
- Activity options: Coding, Studying, Workout, Travel, and Relax.
- Save favourites and preferences in localStorage.
- Include loading, empty, and playback-error states.

**Music data**
- Initially use a small, explicitly licensed demo catalogue with valid audio URLs and artwork.
- Never invent audio URLs or pretend unavailable songs are playable.
- Keep track metadata separate from the player implementation so a legitimate music API can be connected later.
- Design the music provider as a replaceable service module.
- Do not add authentication, payments, or an unnecessary backend in the first version.

**Important**
Prioritize a working music player and polished user experience over extra features. Test all playback controls and verify that the supplied audio sources actually load. Do not use copyrighted commercial music without the appropriate rights.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b81055b1-0ba2-4010-a97b-6638df1f78d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
