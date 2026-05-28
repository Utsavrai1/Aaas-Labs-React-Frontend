import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Github,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "@/lib/constant";

const API = `${BACKEND_URL}/api/assets`;

interface Asset {
  _id: string;
  name: string;
  type: "domain" | "github";
  url: string;
  tags: string[];
  notes?: string;
  lastScannedAt?: string;
  createdAt: string;
}

const EMPTY: Omit<Asset, "_id" | "createdAt"> = {
  name: "",
  type: "domain",
  url: "",
  tags: [],
  notes: "",
};

function getRelativeTime(dateStr?: string) {
  if (!dateStr) return "Never";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function AssetDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partial<Asset> | null;
  onSave: (data: Partial<Asset>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Asset>>(initial ?? EMPTY);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ?? EMPTY);
    setTagInput("");
  }, [initial, open]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || form.tags?.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...(f.tags ?? []), t] }));
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((t) => t !== tag) }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    if (!form.url?.trim())  { toast.error("URL is required"); return; }
    setSaving(true);
    try { await onSave(form); onOpenChange(false); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{initial?._id ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="My production API"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type ?? "domain"}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as Asset["type"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="domain">
                  <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Domain / URL</div>
                </SelectItem>
                <SelectItem value="github">
                  <div className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub Repository</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{form.type === "github" ? "Repository URL" : "Target URL"}</Label>
            <Input
              placeholder={form.type === "github" ? "https://github.com/owner/repo" : "https://example.com"}
              value={form.url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags <span className="text-zinc-400 text-xs">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="production, api, critical…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {form.tags!.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  >
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="text-zinc-400 text-xs">(optional)</span></Label>
            <Input
              placeholder="Any context about this asset…"
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const load = async () => {
    try {
      const res = await fetch(API, { credentials: "include" });
      if (!res.ok) throw new Error();
      setAssets(await res.json());
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Partial<Asset>) => {
    const isEdit = !!editing?._id;
    const url = isEdit ? `${API}/${editing!._id}` : API;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Failed to save asset"); return; }
    toast.success(isEdit ? "Asset updated" : "Asset added");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    const res = await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Asset deleted");
    setAssets((a) => a.filter((x) => x._id !== id));
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (a: Asset) => { setEditing(a); setDialogOpen(true); };

  const domains = assets.filter((a) => a.type === "domain");
  const repos   = assets.filter((a) => a.type === "github");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your domains and repositories — use them as workflow targets
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Globe className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No assets yet</p>
          <p className="text-sm mt-1 mb-4">Add domains or GitHub repos to track and scan them easily.</p>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add your first asset
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Domains */}
          {domains.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Domains & URLs
              </h2>
              <div className="space-y-2">
                {domains.map((a) => <AssetRow key={a._id} asset={a} onEdit={openEdit} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {/* Repos */}
          {repos.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" /> GitHub Repositories
              </h2>
              <div className="space-y-2">
                {repos.map((a) => <AssetRow key={a._id} asset={a} onEdit={openEdit} onDelete={handleDelete} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <AssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}

function AssetRow({
  asset,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  onEdit: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = asset.type === "github" ? Github : Globe;

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{asset.name}</span>
          {asset.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              <Tag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{asset.url}</p>
        {asset.notes && <p className="text-xs text-zinc-400 italic mt-0.5 truncate">{asset.notes}</p>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3 w-3" />
          {getRelativeTime(asset.lastScannedAt)}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(asset)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:text-red-500"
          onClick={() => onDelete(asset._id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
