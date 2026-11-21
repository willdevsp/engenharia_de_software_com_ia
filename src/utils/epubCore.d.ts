import type JSZip from 'jszip';
import type { ChapterData, OfficialDocRef, SessionQuizBank, VideoResource } from '../types/course';

export interface EpubImageAssetInput {
  fileName: string;
  data: Uint8Array | ArrayBuffer;
}

export interface BuildModuleEpubInput {
  moduleId: number;
  code?: string;
  moduleTitle: string;
  chapters: Array<
    Partial<ChapterData> & {
      officialDocs?: OfficialDocRef[];
      videos?: VideoResource[];
      body?: string;
    }
  >;
  quizzes: Record<string, SessionQuizBank>;
  images: EpubImageAssetInput[];
}

export interface BuiltModuleEpubPackage {
  zip: JSZip;
  epubFileName: string;
  chaptersCount: number;
  quizzesCount: number;
  imagesCount: number;
}

export function buildModuleEpubPackage(input: BuildModuleEpubInput): BuiltModuleEpubPackage;
export function latexToKindleXhtml(latex: string, isDisplay?: boolean): string;
export function renderMarkdownWithKindleMath(markdown: string): string;
export function renderInlineQuizTextForKindle(text?: string): string;
export function escapeXml(unsafe?: string): string;
export function slugifyHeading(text: string): string;
export const EPUB_STYLES_CSS: string;
