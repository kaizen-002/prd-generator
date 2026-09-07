import JSZip from "jszip";

/** Shared save path, so the anchor and object-URL handling exists once. */
function save(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Client-side file save. Filenames match repo-root convention exactly. */
export function downloadMarkdown(filename: string, content: string): void {
  save(filename, new Blob([content], { type: "text/markdown;charset=utf-8" }));
}

export interface BundleEntry {
  filename: string;
  content: string;
}

/**
 * All documents as one archive.
 *
 * A zip rather than several sequential saves: browsers prompt on the second
 * programmatic download and silently drop the rest, so firing four in a row is
 * unreliable in exactly the case this button exists for. Files sit at the root
 * of the archive so they unzip straight into a repository.
 */
export async function downloadBundle(
  entries: BundleEntry[],
  zipName = "preparation-docs.zip",
): Promise<void> {
  const zip = new JSZip();
  for (const entry of entries) {
    if (entry.content.trim()) zip.file(entry.filename, entry.content);
  }
  save(zipName, await zip.generateAsync({ type: "blob" }));
}

export async function copyText(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}
