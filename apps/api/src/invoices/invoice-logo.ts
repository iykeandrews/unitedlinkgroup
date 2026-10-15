import { BadRequestException } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile, stat } from "node:fs/promises";
import { UploadsService } from "../uploads/uploads.service";

export type InvoiceLogo = {
  bytes: Buffer;
  dataUrl: string;
  format: "PNG" | "JPEG";
  contentType: string;
};
const MAX_BYTES = 5 * 1024 * 1024;
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const)
  blocked.addSubnet(address, prefix, "ipv6");
export function publicLogoAddress(address: string) {
  const family = isIP(address);
  return !!family && !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}
function decodeLogo(bytes: Buffer): InvoiceLogo {
  if (!bytes.length || bytes.length > MAX_BYTES) throw Error("Logo size");
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw Error("Logo format");
  const contentType = png ? "image/png" : "image/jpeg";
  return {
    bytes,
    format: png ? "PNG" : "JPEG",
    contentType,
    dataUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
  };
}
async function download(url: URL, redirects = 0): Promise<Buffer> {
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    redirects > 3
  )
    throw Error("Logo URL");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(hostname, { all: true }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error("DNS timeout")), 5000);
    }),
  ]).finally(() => clearTimeout(timer));
  if (
    !addresses.length ||
    addresses.some((item) => !publicLogoAddress(item.address))
  )
    throw Error("Logo host");
  return new Promise((resolve, reject) => {
    // Pin the validated address to prevent DNS rebinding; retain normal TLS verification.
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        headers: { 'User-Agent': 'UnitedLinkGroup-Invoice/1.0', Accept: 'image/png,image/jpeg,image/*;q=0.8' },
        lookup: ((_host: string, options: any, callback: any) =>
          options?.all
            ? callback(null, [addresses[0]])
            : callback(null, addresses[0].address, addresses[0].family)) as any,
      },
      (response) => {
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode || 0) &&
          response.headers.location
        ) {
          response.resume();
          download(new URL(response.headers.location, url), redirects + 1).then(
            resolve,
            reject,
          );
          return;
        }
        if (
          response.statusCode !== 200 ||
          Number(response.headers["content-length"] || 0) > MAX_BYTES
        ) {
          response.resume();
          reject(Error(`Logo response (${response.statusCode})`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            response.destroy();
            reject(Error("Logo size"));
          } else chunks.push(Buffer.from(chunk));
        });
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );
    const deadline = setTimeout(() => req.destroy(Error("Logo timeout")), 8000);
    req.once("close", () => clearTimeout(deadline));
    req.setTimeout(8000, () => req.destroy(Error("Logo timeout")));
    req.on("error", reject);
    req.end();
  });
}
export async function loadInvoiceLogo(
  value?: string | null,
): Promise<InvoiceLogo | null> {
  if (!value?.trim()) return null;
  try {
    const source = value.trim();
    if (source.startsWith("data:")) {
      if (
        source.length > MAX_BYTES * 1.4 ||
        !/^data:image\/(png|jpeg);base64,/i.test(source)
      )
        throw Error("Logo data");
      return decodeLogo(
        Buffer.from(source.slice(source.indexOf(",") + 1), "base64"),
      );
    }
    if (source.startsWith("/uploads/")) {
      const key = source.slice("/uploads/".length);
      if (!/^[A-Za-z0-9_.-]+$/.test(key) || key.includes(".."))
        throw Error("Logo key");
      const uploads = new UploadsService();
      if (uploads.isS3Enabled())
        return decodeLogo(
          await download(new URL(await uploads.getSignedDownloadUrl(key, 60))),
        );
      const filename = uploads.getLocalFilePath(key);
      if ((await stat(filename)).size > MAX_BYTES) throw Error("Logo size");
      return decodeLogo(await readFile(filename));
    }
    return decodeLogo(await download(new URL(source)));
  } catch (cause) {
    throw new BadRequestException(
      "The business logo could not be loaded. In Business Profile, use a public PNG or JPEG image URL (up to 5 MB), then try again.",
      { cause },
    );
  }
}
