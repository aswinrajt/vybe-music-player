<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Music data comes only through `MusicProvider` (src/lib/music/provider.ts); UI and player never import catalogue data directly — so a real music API can replace the demo provider.
- One shared HTMLAudioElement lives in `PlayerProvider` mounted in __root — so playback survives navigation.
- Demo audio is CC BY 4.0 (Kevin MacLeod) hosted via lovable-assets; never add tracks without a verified license and URL.
