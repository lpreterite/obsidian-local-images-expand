import { SHA256 } from "./utils";

class LinkHashes {
  private linksInfo: Record<string, string> = {};

  async ensureHashGenerated(link: string, data: ArrayBuffer) {
    if (!this.linksInfo[link]) {
      this.linksInfo[link] = await SHA256(data);
    }
  }

  async isSame(link: string, data: ArrayBuffer) {
    const fileHash = await SHA256(data);
    return this.linksInfo[link] === fileHash;
  }
}

export const linkHashes = new LinkHashes();
