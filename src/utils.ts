import { Platform, requestUrl } from 'obsidian';
import filenamify from "filenamify";
import { DIRTY_IMAGE_TAG, FORBIDDEN_SYMBOLS_FILENAME_PATTERN } from "./config";

// 平台检测
export const isMobile = () => Platform.isMobile;
/*
https://stackoverflow.com/a/48032528/1020973
It will be better to do it type-correct.

*/
export async function replaceAsync(str: any, regex: any, asyncFn: any) {
  const promises: Promise<any>[] = [];
  str.replace(regex, (match: string, ...args: any) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

export function isUrl(link: string) {
  try {
    return Boolean(new URL(link));
  } catch (_) {
    return false;
  }
}

export async function downloadImage(url: string): Promise<ArrayBuffer> {
  try {
    const response = await requestUrl({
      url: url,
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.arrayBuffer) {
      throw new Error(`图片下载失败: ${response.status}`);
    }

    return response.arrayBuffer;
  } catch (error) {
    console.error('下载图片失败:', error);
    throw error;
  }
}

export async function fileExtByContent(content: ArrayBuffer): Promise<string | undefined> {
  try {
    // 通过内容的前几个字节来判断文件类型
    const uint8Array = new Uint8Array(content);
    const signatures: { [key: string]: number[] } = {
      'jpg': [0xFF, 0xD8, 0xFF],
      'png': [0x89, 0x50, 0x4E, 0x47],
      'gif': [0x47, 0x49, 0x46, 0x38],
      'webp': [0x52, 0x49, 0x46, 0x46],
      'bmp': [0x42, 0x4D]
    };

    for (const [ext, signature] of Object.entries(signatures)) {
      if (signature.every((byte: number, i: number) => uint8Array[i] === byte)) {
        return ext;
      }
    }

    // 检查是否为SVG（查找XML头部和svg标签）
    const text = new TextDecoder().decode(uint8Array.slice(0, 100));
    if (text.includes('<?xml') && text.toLowerCase().includes('<svg')) {
      return 'svg';
    }

    return undefined;
  } catch (error) {
    console.error('获取文件类型失败:', error);
    return undefined;
  }
}

function recreateImageTag(match: string, anchor: string, link: string) {
  return `![${anchor}](${link})`;
}

export function cleanContent(content: string) {
  const cleanedContent = content.replace(DIRTY_IMAGE_TAG, recreateImageTag);
  return cleanedContent;
}

export function cleanFileName(name: string) {
  const cleanedName = filenamify(name).replace(
    FORBIDDEN_SYMBOLS_FILENAME_PATTERN,
    "_"
  );
  return cleanedName;
}

export function pathJoin(dir: string, subpath: string): string {
  // 使用跨平台的路径拼接方法
  const result = [dir, subpath].join('/');
  return result.replace(/\\/g, "/");
}

export async function SHA256(data: ArrayBuffer): Promise<string> {
  // 使用 Web Crypto API 计算 SHA-256 哈希值
  // SHA-256 提供了很好的安全性和哈希分布，适合用作文件名
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('计算哈希值失败:', error);
    // 作为备用方案，生成一个基于时间戳的唯一标识符
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).slice(2, 10);
    return timestamp + random;
  }
}
