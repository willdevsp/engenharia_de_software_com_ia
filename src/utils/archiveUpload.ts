import { Capacitor, registerPlugin } from '@capacitor/core';
import { getCloudConfig, isArchiveConfigured, sanitizeBucketName } from './cloudConfig';

interface ArchiveS3NativePlugin {
  uploadFile(options: {
    relativePath: string;
    bucket: string;
    fileName: string;
    accessKey: string;
    secretKey: string;
    mimeType: string;
  }): Promise<{ status: number; audioUrl: string }>;

  downloadFile(options: {
    url: string;
    relativePath: string;
  }): Promise<{ sizeBytes: number; relativePath: string }>;
}

const ArchiveS3 = registerPlugin<ArchiveS3NativePlugin>('ArchiveS3');

export function sanitizeArchiveFileName(
  sessionId: string,
  originalName: string,
  format: 'mp3' | 'm4a'
): string {
  const sessionSlug = (sessionId || '0-0').replace(/[^a-zA-Z0-9]+/g, '-');
  const rawBase = (originalName || 'audio')
    .replace(/\.(mp3|m4a)$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const slug = rawBase || 'audio-sessao';
  return `sessao-${sessionSlug}-${Date.now()}-${slug}.${format}`;
}

export function buildArchivePublicUrl(bucket: string, fileName: string): string {
  return `https://archive.org/download/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}`;
}

export interface ArchiveUploadParams {
  file: File;
  sessionId: string;
  format: 'mp3' | 'm4a';
  mimeType: string;
  localRelativePath?: string;
}

export interface ArchiveUploadResult {
  archiveBucket: string;
  archiveFileName: string;
  audioUrl: string;
}

export async function uploadAudioToArchive({
  file,
  sessionId,
  format,
  mimeType,
  localRelativePath
}: ArchiveUploadParams): Promise<ArchiveUploadResult> {
  const cfg = getCloudConfig();
  if (!isArchiveConfigured(cfg)) {
    throw new Error(
      'Credenciais do Archive.org (IAS3) não configuradas. Configure no .env.local ou no botão Configurações (ícone de engrenagem).'
    );
  }

  const bucket = sanitizeBucketName(cfg.archiveBucket);
  const archiveFileName = sanitizeArchiveFileName(sessionId, file.name, format);

  if (Capacitor.isNativePlatform()) {
    if (!localRelativePath) {
      throw new Error('Caminho local temporário ausente para upload nativo no Android.');
    }
    const res = await ArchiveS3.uploadFile({
      relativePath: localRelativePath,
      bucket,
      fileName: archiveFileName,
      accessKey: cfg.archiveAccessKey,
      secretKey: cfg.archiveSecretKey,
      mimeType
    });
    return {
      archiveBucket: bucket,
      archiveFileName,
      audioUrl: res.audioUrl || buildArchivePublicUrl(bucket, archiveFileName)
    };
  }

  const proxyUrl = `/api/ias3/${encodeURIComponent(bucket)}/${encodeURIComponent(archiveFileName)}`;
  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method: 'PUT',
      headers: {
        Authorization: `LOW ${cfg.archiveAccessKey}:${cfg.archiveSecretKey}`,
        'Content-Type': mimeType,
        'x-amz-auto-make-bucket': '1',
        'x-archive-meta-mediatype': 'audio',
        'x-archive-queue-derive': '0'
      },
      body: file
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'erro de rede';
    throw new Error(
      `Falha ao conectar ao proxy IAS3 no Desktop (${reason}). Verifique sua internet e execute via "npm run dev" no Desktop.`
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(
      `Archive.org retornou erro HTTP ${response.status}${detail ? `: ${detail}` : '.'}`
    );
  }

  return {
    archiveBucket: bucket,
    archiveFileName,
    audioUrl: buildArchivePublicUrl(bucket, archiveFileName)
  };
}

export interface ArchiveDownloadParams {
  audioUrl: string;
  archiveBucket?: string;
  archiveFileName?: string;
  destRelativePath?: string;
}

export async function downloadAudioBinaryFromArchive({
  audioUrl,
  archiveBucket,
  archiveFileName,
  destRelativePath
}: ArchiveDownloadParams): Promise<{ nativePath?: string; blob?: Blob }> {
  if (Capacitor.isNativePlatform()) {
    if (!destRelativePath) {
      throw new Error('Caminho de destino ausente para download offline no Android.');
    }
    await ArchiveS3.downloadFile({
      url: audioUrl,
      relativePath: destRelativePath
    });
    return { nativePath: destRelativePath };
  }

  const targetUrl =
    archiveBucket && archiveFileName
      ? `/api/archive-download/${encodeURIComponent(archiveBucket)}/${encodeURIComponent(archiveFileName)}`
      : audioUrl;

  let response: Response;
  try {
    response = await fetch(targetUrl);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'erro de rede';
    throw new Error(
      `Falha ao baixar áudio para cache offline (${reason}). No Desktop use "npm run dev" para o proxy sem CORS.`
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'Arquivo ainda propagando no Archive.org (404). Aguarde 15–60s após o upload e tente novamente.'
      );
    }
    throw new Error(`Falha ao baixar áudio do Archive.org (HTTP ${response.status}).`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(
      'O servidor respondeu HTML em vez de áudio. Use "npm run dev" no Desktop ou aguarde a propagação no Archive.org.'
    );
  }

  const blob = await response.blob();
  return { blob };
}
