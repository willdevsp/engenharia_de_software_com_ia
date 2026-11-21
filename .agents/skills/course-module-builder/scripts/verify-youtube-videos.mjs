import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const chaptersDir = path.resolve(process.cwd(), process.argv[2] || 'content/modulo-01/chapters');

if (!fs.existsSync(chaptersDir)) {
  console.error(JSON.stringify({ status: 'ERROR', message: `Diretório não encontrado: ${chaptersDir}` }, null, 2));
  process.exit(1);
}

function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function hasPortugueseSignals(text = '') {
  if (/[áéíóúãõâêôçà]/i.test(text)) return true;
  return /\b(como|para|com|sem|seu|sua|guia|aula|entenda|pr[aá]tica|explicado|iniciantes|navegador|portugu[eê]s|programa[cç][aã]o|intelig[eê]ncia)\b/i.test(
    text
  );
}

async function checkVideoMetadata(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oeRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
  );
  if (!oeRes.ok) {
    return {
      ok: false,
      error: `oEmbed retornou HTTP ${oeRes.status} para ${watchUrl}`
    };
  }
  const oeData = await oeRes.json();

  const pageRes = await fetch(watchUrl, {
    headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
  });
  const html = await pageRes.text();
  const prMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!prMatch) {
    return {
      ok: true,
      oembedTitle: oeData.title,
      oembedChannel: oeData.author_name,
      playableInEmbed: true,
      captions: [],
      playerParsed: false
    };
  }

  let pr;
  try {
    pr = JSON.parse(prMatch[1]);
  } catch {
    return {
      ok: true,
      oembedTitle: oeData.title,
      oembedChannel: oeData.author_name,
      playableInEmbed: true,
      captions: [],
      playerParsed: false
    };
  }

  const playabilityStatus = pr.playabilityStatus?.status || 'UNKNOWN';
  const playableInEmbed = pr.playabilityStatus?.playableInEmbed !== false;
  const captions = (pr.captions?.playerCaptionsTracklistRenderer?.captionTracks || []).map(
    (c) => String(c.languageCode || '')
  );

  if (playabilityStatus !== 'OK') {
    return {
      ok: false,
      error: `Vídeo indisponível (${playabilityStatus}) em ${watchUrl}`
    };
  }
  if (!playableInEmbed) {
    return {
      ok: false,
      error: `Vídeo bloqueado para incorporação (playableInEmbed=false) em ${watchUrl}`
    };
  }

  return {
    ok: true,
    oembedTitle: oeData.title || pr.videoDetails?.title,
    oembedChannel: oeData.author_name || pr.videoDetails?.author,
    playableInEmbed,
    captions,
    playerParsed: true
  };
}

const files = fs.readdirSync(chaptersDir).filter((f) => f.endsWith('.md')).sort();
const errors = [];
const warnings = [];
const cache = new Map();
const chapterReports = [];

for (const file of files) {
  const fullPath = path.join(chaptersDir, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    errors.push(`[${file}] Frontmatter YAML ausente.`);
    continue;
  }

  const fm = YAML.parse(fmMatch[1]) || {};
  const session = String(fm.session || file);
  const media = fm.media || {};
  const entries = [];

  if (Array.isArray(media.videos)) {
    for (const v of media.videos) {
      entries.push({ ...v, source: 'media.videos' });
    }
  } else if (media.video_url) {
    entries.push({ title: fm.title, channel: '', url: media.video_url, source: 'media.video_url' });
  }

  if (media.video_url && Array.isArray(media.videos) && media.videos.length > 0) {
    const primaryMatches = media.videos.some((v) => v.url === media.video_url);
    if (!primaryMatches) {
      warnings.push(`[${file}] media.video_url (${media.video_url}) não corresponde a nenhum item em media.videos.`);
    }
  }

  const checkedVideos = [];
  for (const item of entries) {
    const videoId = extractYouTubeId(item.url);
    if (!videoId) {
      errors.push(`[${file}] URL do YouTube inválida em ${item.source}: ${item.url}`);
      continue;
    }

    if (!cache.has(videoId)) {
      cache.set(videoId, await checkVideoMetadata(videoId));
    }
    const info = cache.get(videoId);
    if (!info.ok) {
      errors.push(`[${file}] ${info.error}`);
      continue;
    }

    const hasPtCaption = info.captions.some((c) => /^pt(-|$)/i.test(c));
    const hasPtText = hasPortugueseSignals(`${info.oembedTitle} ${info.oembedChannel}`);
    const isLikelyPt = hasPtCaption || hasPtText;
    const declaredLang = String(item.language || '').toLowerCase();

    if (!isLikelyPt && declaredLang !== 'en') {
      warnings.push(
        `[${file}] Vídeo "${info.oembedTitle}" (${info.oembedChannel}) aparenta não estar em português. Se não houver equivalente em PT-BR, adicione \`language: "en"\` ao item em media.videos.`
      );
    }

    checkedVideos.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: info.oembedTitle,
      channel: info.oembedChannel,
      languageDetected: declaredLang === 'en' ? 'en (fallback)' : isLikelyPt ? 'pt-BR' : 'indeterminado',
      captions: info.captions
    });
  }

  chapterReports.push({
    file,
    session,
    videoCount: checkedVideos.length,
    videos: checkedVideos
  });
}

const report = {
  status: errors.length === 0 ? 'VALID' : 'INVALID',
  chaptersChecked: files.length,
  uniqueVideosChecked: cache.size,
  errors,
  warnings,
  chapters: chapterReports
};

console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) {
  process.exit(1);
}
