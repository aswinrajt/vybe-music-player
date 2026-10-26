import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useTransition } from "react";
import {
  UploadCloud,
  Music,
  Image as ImageIcon,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Database,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/player/PlayerProvider";
import { MOODS, ACTIVITIES, type Mood, type Activity, type Track } from "@/lib/music/types";
import { cn } from "@/lib/utils";
import { fmt } from "@/components/vybe/bits";
import {
  deleteTrackServerFn,
  getUploadUrlServerFn,
  createTrackServerFn,
  uploadFileServerFn,
} from "@/lib/music/tracks-fns";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Studio — VYBE" },
      { name: "description", content: "Manage tracks and audio files on Cloudflare R2." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { tracks, refreshTracks, playTrack, current, status, toggle } = usePlayer();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Lo-Fi");
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>(["Focused"]);
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>(["Coding"]);
  const [licenseName, setLicenseName] = useState("CC BY 4.0");
  const [attribution, setAttribution] = useState("");

  // File State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);

  // Handle Audio Selection
  const handleAudioSelect = (file: File) => {
    setAudioFile(file);
    // Derive default title and artist from filename if not set
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (!title) {
      if (baseName.includes("-")) {
        const parts = baseName.split("-").map((s) => s.trim());
        if (!artist && parts[0]) setArtist(parts[0]);
        if (parts[1]) setTitle(parts.slice(1).join("-").trim());
      } else {
        setTitle(baseName);
      }
    }

    // Measure audio duration
    try {
      const url = URL.createObjectURL(file);
      const tempAudio = new Audio(url);
      tempAudio.addEventListener("loadedmetadata", () => {
        if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
          setAudioDuration(Math.round(tempAudio.duration));
        }
        URL.revokeObjectURL(url);
      });
    } catch {
      // Audio element not supported in current environment
    }
  };

  // Handle Artwork Selection
  const handleArtworkSelect = (file: File) => {
    setArtworkFile(file);
    const url = URL.createObjectURL(file);
    setArtworkPreview(url);
  };

  const toggleMood = (m: Mood) => {
    setSelectedMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const toggleActivity = (a: Activity) => {
    setSelectedActivities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Upload to R2: attempts direct pre-signed upload, and seamlessly falls back to server proxy if CORS is blocked
  const uploadFileToR2 = async (file: File, category: "audio" | "artwork"): Promise<string> => {
    // 1. Try direct upload first
    try {
      setUploadProgress(`Requesting upload slot for ${category}...`);
      const { uploadUrl, publicUrl } = await getUploadUrlServerFn({
        data: {
          filename: file.name,
          contentType: file.type || (category === "audio" ? "audio/mpeg" : "image/jpeg"),
          category,
        },
      });

      setUploadProgress(`Directly uploading ${category} (${Math.round(file.size / 1024)} KB)...`);
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || (category === "audio" ? "audio/mpeg" : "image/jpeg"),
        },
        body: file,
      });

      if (uploadRes.ok) {
        return publicUrl;
      }
    } catch (corsErr) {
      console.warn("Direct R2 upload blocked (CORS). Using server-side proxy fallback...", corsErr);
    }

    // 2. Server-side proxy fallback (100% bypasses browser CORS)
    setUploadProgress(`Uploading ${category} via server proxy...`);
    const base64 = await fileToBase64(file);
    const { publicUrl } = await uploadFileServerFn({
      data: {
        name: file.name,
        type: file.type || (category === "audio" ? "audio/mpeg" : "image/jpeg"),
        base64,
        category,
      },
    });

    return publicUrl;
  };

  // Submit Handler
  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a track title");
      return;
    }
    if (!artist.trim()) {
      toast.error("Please enter an artist name");
      return;
    }
    if (!audioFile) {
      toast.error("Please select an audio file (.mp3, .wav, .m4a)");
      return;
    }

    startTransition(async () => {
      try {
        setUploadProgress("Starting upload...");

        // 1. Upload audio
        const audioUrl = await uploadFileToR2(audioFile, "audio");

        // 2. Upload artwork if provided
        let artworkUrl =
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80";
        if (artworkFile) {
          artworkUrl = await uploadFileToR2(artworkFile, "artwork");
        }

        setUploadProgress("Saving track to catalogue...");

        // 3. Create track metadata
        const trackId = `${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 20)}-${Math.random().toString(36).substring(2, 8)}`;

        const newTrack: Track = {
          id: trackId,
          title: title.trim(),
          artist: artist.trim(),
          genre: genre.trim() || "General",
          durationHint: audioDuration,
          audioUrl,
          artworkUrl,
          moods: selectedMoods,
          activities: selectedActivities,
          license: {
            name: licenseName || "Personal Library",
            url: "",
            attribution: attribution.trim() || artist.trim(),
          },
        };

        await createTrackServerFn({ data: newTrack });

        // 4. Reload player catalogue
        await refreshTracks();

        toast.success(`Track "${newTrack.title}" added to R2!`);

        // Reset form
        setTitle("");
        setArtist("");
        setAudioFile(null);
        setArtworkFile(null);
        setArtworkPreview(null);
        setAudioDuration(undefined);
        if (audioInputRef.current) audioInputRef.current.value = "";
        if (artworkInputRef.current) artworkInputRef.current.value = "";
      } catch (err: unknown) {
        console.error("Upload error:", err);
        const msg = err instanceof Error ? err.message : "Failed to upload track to R2";
        toast.error(msg);
      } finally {
        setUploadProgress(null);
      }
    });
  };

  // Delete Track Handler
  const handleDeleteTrack = async (track: Track) => {
    if (!confirm(`Are you sure you want to delete "${track.title}" from R2?`)) return;

    setDeletingId(track.id);
    try {
      await deleteTrackServerFn({ data: { id: track.id } });
      await refreshTracks();
      toast.success(`Deleted "${track.title}" from catalogue.`);
    } catch (err: unknown) {
      console.error("Delete error:", err);
      toast.error("Failed to delete track.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTracks = tracks.filter((t) =>
    [t.title, t.artist, t.genre].some((field) =>
      field.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-10 pb-16">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" /> Admin Studio
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <Database className="size-3" /> Cloudflare R2
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Music Catalogue Manager
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload audio files directly to Cloudflare R2 and manage the live streaming library.
          </p>
        </div>

        <button
          onClick={() => {
            refreshTracks().then(() => toast.info("Catalogue refreshed from R2."));
          }}
          className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground md:self-auto"
        >
          <RefreshCw className="size-3.5" /> Refresh R2 Library
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Upload Form (Left Column, 7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Upload New Track</h2>
                  <p className="text-xs text-muted-foreground">
                    Direct streaming via Cloudflare R2 CDN
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateTrack} className="space-y-6">
              {/* File Dropzones */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Audio Upload */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Audio File (.mp3, .wav, .m4a) *
                  </label>
                  <div
                    onClick={() => audioInputRef.current?.click()}
                    className={cn(
                      "group flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all",
                      audioFile
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/40",
                    )}
                  >
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioSelect(file);
                      }}
                    />
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {audioFile ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      ) : (
                        <Music className="size-5" />
                      )}
                    </div>
                    {audioFile ? (
                      <div className="mt-2">
                        <p className="line-clamp-1 text-xs font-semibold text-foreground">
                          {audioFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                          {audioDuration ? ` · ~${fmt(audioDuration)}` : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground">Click to select audio</p>
                        <p className="text-[11px] text-muted-foreground">
                          MP3, WAV, M4A up to 100MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Artwork Upload */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cover Artwork (Optional)
                  </label>
                  <div
                    onClick={() => artworkInputRef.current?.click()}
                    className={cn(
                      "group flex min-h-[140px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition-all relative",
                      artworkPreview
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/40",
                    )}
                  >
                    <input
                      ref={artworkInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleArtworkSelect(file);
                      }}
                    />
                    {artworkPreview ? (
                      <div className="relative size-full flex items-center justify-center gap-3">
                        <img
                          src={artworkPreview}
                          alt="Cover preview"
                          className="size-16 rounded-xl object-cover shadow-md"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground">Artwork ready</p>
                          <p className="text-[11px] text-muted-foreground">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-muted-foreground group-hover:scale-110 transition-transform">
                          <ImageIcon className="size-5" />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-foreground">Choose album art</p>
                          <p className="text-[11px] text-muted-foreground">Square JPG or PNG</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Track Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Midnight Solitude"
                    className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Artist *
                  </label>
                  <input
                    type="text"
                    required
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Luna Solis"
                    className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Genre & Attribution */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. Ambient, Lo-Fi, Electronic"
                    className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    License / Attribution
                  </label>
                  <input
                    type="text"
                    value={licenseName}
                    onChange={(e) => setLicenseName(e.target.value)}
                    placeholder="e.g. CC BY 4.0 or Personal License"
                    className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Mood Tags */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mood Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => {
                    const active = selectedMoods.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMood(m)}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "bg-gradient-primary text-primary-foreground shadow-sm"
                            : "border border-border/70 bg-card hover:border-primary/40 text-muted-foreground",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Tags */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Activity Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITIES.map((a) => {
                    const active = selectedActivities.includes(a);
                    return (
                      <button
                        type="button"
                        key={a}
                        onClick={() => toggleActivity(a)}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "bg-gradient-primary text-primary-foreground shadow-sm"
                            : "border border-border/70 bg-card hover:border-primary/40 text-muted-foreground",
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress indicator */}
              {uploadProgress && (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs font-medium text-primary">
                  <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 font-display text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Uploading to Cloudflare R2...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />
                    Upload & Publish to R2
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Tracks Manager (Right Column, 5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Active Catalogue</h2>
                <p className="text-xs text-muted-foreground">
                  {tracks.length} {tracks.length === 1 ? "track" : "tracks"} total
                </p>
              </div>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                Live R2
              </span>
            </div>

            {/* Search filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, artist, genre..."
                className="w-full rounded-xl border border-input bg-background/80 py-2 pl-9 pr-4 text-xs transition focus:border-primary focus:outline-none"
              />
            </div>

            {/* Track list */}
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredTracks.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No matching tracks found.
                </div>
              ) : (
                filteredTracks.map((t) => {
                  const isCurrent = current?.id === t.id;
                  const isPlaying = isCurrent && status === "playing";
                  const isDeleting = deletingId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl border p-2.5 transition-all",
                        isCurrent
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/50 bg-card/40 hover:border-border hover:bg-card",
                      )}
                    >
                      {/* Thumbnail & Preview Button */}
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                        <img src={t.artworkUrl} alt={t.title} className="size-full object-cover" />
                        <button
                          onClick={() => {
                            if (isCurrent) toggle();
                            else playTrack(t, tracks);
                          }}
                          aria-label={isPlaying ? "Pause" : "Play"}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          {isPlaying ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4 fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-foreground">{t.title}</p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{t.artist}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground">
                            {t.genre}
                          </span>
                          {t.durationHint ? (
                            <span className="text-[10px] text-muted-foreground">
                              · {fmt(t.durationHint)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Delete action */}
                      <div className="flex items-center gap-1">
                        <a
                          href={t.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open R2 Audio URL"
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteTrack(t)}
                          disabled={isDeleting}
                          title="Delete from R2"
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <div className="size-3.5 animate-spin rounded-full border border-destructive border-t-transparent" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick R2 Info Card */}
          <div className="rounded-2xl border border-border/40 bg-card/30 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" /> R2 Architecture Note
            </div>
            <p className="mt-1.5 leading-relaxed">
              Files are streamed through Cloudflare R2's global edge network. All tracks uploaded
              here immediately sync with your VYBE music player across all devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
