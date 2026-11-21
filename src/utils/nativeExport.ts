import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const EPUB_ASSET_URL = './downloads/modulo-01-kindle-colorsoft.epub';
const EPUB_OUTPUT_FILENAME = 'Engenharia-Software-IA-Modulo-01-Kindle-Colorsoft.epub';

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.onerror = () => reject(reader.error || new Error('Falha ao converter arquivo para Base64.'));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(href: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportKindleEpub(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    triggerBrowserDownload(EPUB_ASSET_URL, EPUB_OUTPUT_FILENAME);
    return;
  }

  const response = await fetch(EPUB_ASSET_URL);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o arquivo EPUB interno (${response.status}).`);
  }
  const blob = await response.blob();
  const base64Data = await readBlobAsBase64(blob);

  await Filesystem.writeFile({
    path: EPUB_OUTPUT_FILENAME,
    data: base64Data,
    directory: Directory.Cache
  });

  const { uri } = await Filesystem.getUri({
    path: EPUB_OUTPUT_FILENAME,
    directory: Directory.Cache
  });

  await Share.share({
    title: 'Engenharia de Software em IA — Módulo 01 (Kindle Colorsoft)',
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
    triggerBrowserDownload(url, fileName);
    URL.revokeObjectURL(url);
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
