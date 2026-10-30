import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import api, { refreshSession } from "./api";
import { getAccessToken } from "./sessionStore";

async function downloadFile(
  url: string,
  uri: string,
  headers: Record<string, string>,
) {
  const task = FileSystem.createDownloadResumable(url, uri, { headers });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      task.downloadAsync(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void task.cancelAsync().catch(() => {});
          reject(
            Error(
              "The download timed out. Please check your connection and try again.",
            ),
          );
        }, 60000);
      }),
    ]);
    if (!result) throw Error("The download was cancelled. Please try again.");
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function shareMobileFile(
  path: string,
  filename: string,
  pdf = false,
  onShareReady?: () => void,
) {
  const base = String(api.defaults.baseURL || "").replace(/\/$/, "");
  const target = new URL(
    /^https?:/i.test(path)
      ? path
      : (path.startsWith("/uploads/") ? new URL(base).origin : base) +
          "/" +
          path.replace(/^\//, ""),
  );
  if (!["http:", "https:"].includes(target.protocol))
    throw Error("Unsupported file address");
  const trusted = target.origin === new URL(base).origin;
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (trusted) {
    if (!token) throw Error("Please sign in again");
    headers.Authorization = "Bearer " + token;
  }
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  if (Platform.OS === "web") {
    const response = trusted
      ? await api.get(target.href, { responseType: "blob" })
      : {
          data: await fetch(target.href, { credentials: "omit" }).then((r) => {
            if (!r.ok) throw Error("File download failed");
            return r.blob();
          }),
        };
    const blob = response.data as Blob;
    if (pdf && !(await blob.slice(0, 5).text()).startsWith("%PDF-"))
      throw Error("The server did not return a valid PDF. Please try again.");
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = safe;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw Error("File storage is unavailable");
  let result = await downloadFile(target.href, directory + safe, headers);
  if (trusted && result.status === 401 && (await getAccessToken())) {
    headers.Authorization = "Bearer " + (await refreshSession());
    result = await downloadFile(target.href, directory + safe, headers);
  }
  if (result.status !== 200) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw Error("Unable to download this file. Please sign in again or retry.");
  }
  if (pdf) {
    const signature = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 5,
    });
    // Native partial reads only honor position/length for Base64 encoding.
    // JVBERi0= is the five-byte PDF signature "%PDF-".
    if (signature !== "JVBERi0=") {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      throw Error("The server did not return a valid PDF. Please try again.");
    }
  }
  if (!(await Sharing.isAvailableAsync()))
    throw Error("File sharing is not available on this device");
  // Some share extensions never settle their native promise after cancellation.
  // The download is finished; callers must not keep their UI locked on that promise.
  onShareReady?.();
  await Sharing.shareAsync(
    result.uri,
    pdf
      ? {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Save or share PDF",
        }
      : { dialogTitle: "Open or share document" },
  );
}
