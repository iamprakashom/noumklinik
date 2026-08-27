import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, inputClass } from "@/components/clinic/bits";
import { formatDate, type PatientPhoto } from "@/data/clinic";
import { useInsert, usePatientPhotos, useRemove } from "@/lib/clinic-data";

const KINDS = ["Before", "After", "Progress"] as const;
const BUCKET = "patient-photos";

function usePhotoUrls(photos: PatientPhoto[]) {
  const paths = photos.map((p) => p.storage_path);
  return useQuery({
    queryKey: ["patient_photo_urls", paths],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
      }
      return map;
    },
  });
}

export function PatientPhotos({ patientId }: { patientId: string }) {
  const all = usePatientPhotos();
  const addPhoto = useInsert("patient_photos");
  const removePhoto = useRemove("patient_photos");
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<string>("Before");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const photos = useMemo(
    () => (all.data ?? []).filter((p: PatientPhoto) => p.patient_id === patientId),
    [all.data, patientId],
  );
  const urls = usePhotoUrls(photos);

  useEffect(() => {
    setCompare((c) => c.filter((id) => photos.some((p: PatientPhoto) => p.id === id)));
  }, [photos]);

  async function upload(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (error) throw error;
        await addPhoto.mutateAsync({
          patient_id: patientId,
          storage_path: path,
          kind,
          caption: caption || null,
        });
      }
      toast.success(files.length > 1 ? "Photos uploaded" : "Photo uploaded");
      setCaption("");
      void urls.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function destroy(photo: PatientPhoto) {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    removePhoto.mutate(photo.id, { onSuccess: () => toast.success("Photo removed") });
  }

  function toggleCompare(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  }

  const comparing = compare
    .map((id) => photos.find((p: PatientPhoto) => p.id === id))
    .filter((p): p is PatientPhoto => Boolean(p));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <Field label="Type" className="w-36">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Caption (optional)" className="min-w-56 flex-1">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Session 2 — right cheek"
            className={inputClass}
          />
        </Field>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && void upload(e.target.files)}
        />
        <button
          type="button"
          className={primaryButton}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-3.5" /> {uploading ? "Uploading…" : "Upload photos"}
        </button>
      </div>

      {comparing.length === 2 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Comparison</h3>
            <button type="button" className={`${ghostButton} ml-auto`} onClick={() => setCompare([])}>
              Clear
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {comparing.map((p) => (
              <figure key={p.id} className="space-y-2">
                <img
                  src={urls.data?.[p.storage_path]}
                  alt={p.caption ?? `${p.kind} photo`}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Chip tone={p.kind === "After" ? "completed" : "idle"}>{p.kind}</Chip>
                  {formatDate(p.created_at)}
                  {p.caption ? <span className="truncate">· {p.caption}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState>No clinical photos yet. Upload before/after images to track progress.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p: PatientPhoto) => {
            const selected = compare.includes(p.id);
            return (
              <figure
                key={p.id}
                className={`group overflow-hidden rounded-xl border bg-card ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setLightbox(urls.data?.[p.storage_path] ?? null)}
                >
                  <img
                    src={urls.data?.[p.storage_path]}
                    alt={p.caption ?? `${p.kind} photo`}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </button>
                <figcaption className="space-y-1.5 p-3">
                  <div className="flex items-center gap-2">
                    <Chip tone={p.kind === "After" ? "completed" : "idle"}>{p.kind}</Chip>
                    <span className="text-[11px] text-muted-foreground">{formatDate(p.created_at)}</span>
                  </div>
                  {p.caption ? <p className="truncate text-xs">{p.caption}</p> : null}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => toggleCompare(p.id)}
                    >
                      {selected ? "Selected" : "Compare"}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete photo"
                      className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => void destroy(p)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          role="dialog"
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close" className="absolute right-6 top-6 text-white">
            <X className="size-5" />
          </button>
          <img src={lightbox} alt="Clinical photo" className="max-h-full max-w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  );
}
