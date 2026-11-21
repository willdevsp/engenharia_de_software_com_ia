import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { COURSE_MODULES } from '../generated/catalog';
import { loadModuleData } from '../generated/moduleLoader';
import { buildModuleEpubPackage, type EpubImageAssetInput } from './epubCore';

export interface EpubExportTarget {
  id?: number;
  code?: string;
  title?: string;
  epubFileName?: string;
  assetFiles?: string[];
}

function triggerBrowserDownload(href: string, fileName: string, revokeAfterMs?: number): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revokeAfterMs && href.startsWith('blob:')) {
    window.setTimeout(() => URL.revokeObjectURL(href), revokeAfterMs);
  }
}

function resolveModuleExportConfig(target?: EpubExportTarget): {
  moduleId: number;
  code: string;
  title: string;
  epubFileName: string;
  assetFiles: string[];
} {
  const matchedById = target?.id
    ? COURSE_MODULES.find((m) => m.id === target.id)
    : target?.code
    ? COURSE_MODULES.find((m) => m.code === target.code)
    : undefined;

  const moduleId = matchedById?.id ?? target?.id ?? (Number(target?.code) || 1);
  const code = matchedById?.code || target?.code || String(moduleId).padStart(2, '0');
  const title = matchedById?.title || target?.title || `Módulo ${code}`;
  const epubFileName =
    matchedById?.epubFileName ||
    target?.epubFileName ||
    `modulo-${code}-kindle-colorsoft.epub`;
  const assetFiles =
    target?.assetFiles && target.assetFiles.length > 0
      ? target.assetFiles
      : matchedById?.assetFiles || [];

  return { moduleId, code, title, epubFileName, assetFiles };
}

async function fetchModuleAssetImages(
  code: string,
  assetFiles: string[]
): Promise<EpubImageAssetInput[]> {
  const uniqueFiles = Array.from(new Set(assetFiles)).filter((f) =>
    /\.(png|jpe?g)$/i.test(f)
  );
  if (uniqueFiles.length === 0) return [];

  const dirName = `modulo-${code}`;
  return Promise.all(
    uniqueFiles.map(async (fileName) => {
      const assetUrl = `./course-assets/${dirName}/${fileName}`;
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(
          `Não foi possível carregar a ilustração "${fileName}" para gerar o EPUB (${response.status}).`
        );
      }
      const buffer = await response.arrayBuffer();
      return {
        fileName,
        data: new Uint8Array(buffer)
      };
    })
  );
}

/**
 * Generates an independent Kindle Colorsoft EPUB 3 per module on-demand in memory (100% offline)
 * using the module's lazy-loaded chapters, quizzes, and local raster assets.
 */
export async function exportKindleEpub(target?: EpubExportTarget): Promise<void> {
  const { moduleId, code, title, epubFileName, assetFiles } = resolveModuleExportConfig(target);
  const shareTitle = `Engenharia de Software em IA — Módulo ${code}: ${title} (Kindle Colorsoft)`;

  const [bundle, images] = await Promise.all([
    loadModuleData(moduleId),
    fetchModuleAssetImages(code, assetFiles)
  ]);

  const { zip } = buildModuleEpubPackage({
    moduleId,
    code,
    moduleTitle: title,
    chapters: bundle.chapters,
    quizzes: bundle.quizzes,
    images
  });

  if (!Capacitor.isNativePlatform()) {
    const blob = await zip.generateAsync({ type: 'blob' });
    const blobUrl = URL.createObjectURL(blob);
    triggerBrowserDownload(blobUrl, epubFileName, 10000);
    return;
  }

  const base64Data = await zip.generateAsync({ type: 'base64' });

  await Filesystem.writeFile({
    path: epubFileName,
    data: base64Data,
    directory: Directory.Cache
  });

  const { uri } = await Filesystem.getUri({
    path: epubFileName,
    directory: Directory.Cache
  });

  await Share.share({
    title: shareTitle,
    text: 'Envie para o app Kindle (Send to Kindle) ou salve nos arquivos do celular.',
    files: [uri],
    dialogTitle: 'Enviar EPUB para Kindle ou Salvar'
  });
}

export async function exportJsonFile(fileName: string, data: unknown): Promise<void> {
  const jsonText = JSON.stringify(data, null, 2);

  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    triggerBrowserDownload(url, fileName, 5000);
    return;
  }

  await Filesystem.writeFile({
    path: fileName,
    data: jsonText,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  });

  const { uri } = await Filesystem.getUri({
    path: fileName,
    directory: Directory.Cache
  });

  await Share.share({
    title: 'Backup de Progresso — Engenharia IA',
    text: 'Arquivo de progresso do curso (.json).',
    files: [uri],
    dialogTitle: 'Exportar Progresso (.json)'
  });
}
