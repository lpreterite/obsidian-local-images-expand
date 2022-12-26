import { URL } from "url";
import path from "path";

import { App, DataAdapter, TFile } from "obsidian";

import {
  isUrl,
  downloadImage,
  fileExtByContent,
  cleanFileName,
  pathJoin,
  md5,
} from "./utils";
import {
  FILENAME_TEMPLATE,
  MAX_FILENAME_INDEX,
  FILENAME_ATTEMPTS,
} from "./config";
import { linkHashes } from "./linksHash";

export function imageTagProcessor(
  app: App,
  mediaDir: string,
  file: TFile,
  useRelativePath: Boolean
) {
  async function processImageTag(match: string, anchor: string, link: string) {
    if (!isUrl(link)) {
      return match;
    }

    try {
      const fileData = await downloadImage(link);

      // when several images refer to the same file they can be partly
      // failed to download because file already exists, so try to resuggest filename several times
      let attempt = 0;
      while (attempt < FILENAME_ATTEMPTS) {
        try {
          const { fileName, needWrite } = await chooseFileName(
            app.vault.adapter,
            mediaDir,
            anchor,
            link,
            fileData
          );

          if (needWrite && fileName) {
            await app.vault.createBinary(fileName, fileData);
          }

          if (fileName) {
            let _fileName = fileName;
            if (useRelativePath)
              _fileName = path.posix.relative(file.parent.path, fileName);
            return `![${anchor}](${_fileName.replace(/\ /g, "%20")})`;
          } else {
            return match;
          }
        } catch (error) {
          if (error.message === "File already exists.") {
            attempt++;
          } else {
            throw error;
          }
        }
      }
      return match;
    } catch (error) {
      console.warn("Image processing failed: ", error);
      return match;
    }
  }

  return processImageTag;
}

async function chooseFileName(
  adapter: DataAdapter,
  dir: string,
  baseName: string,
  link: string,
  contentData: ArrayBuffer
): Promise<{ fileName: string; needWrite: boolean }> {
  const fileExt = await fileExtByContent(contentData);
  if (!fileExt) {
    return { fileName: "", needWrite: false };
  }

  let fileName = pathJoin(dir, `${md5(contentData)}.${fileExt}`);
  let needWrite = true;
  if (await adapter.exists(fileName, false)) {
    linkHashes.ensureHashGenerated(link, contentData);
    const fileData = await adapter.readBinary(fileName);
    if (linkHashes.isSame(link, fileData)) {
      needWrite = false;
    }
  }

  if (!fileName) {
    throw new Error("Failed to generate file name for media file.");
  }

  linkHashes.ensureHashGenerated(link, contentData);

  return { fileName, needWrite };
}
