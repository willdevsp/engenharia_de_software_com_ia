package com.will.engenhariasoftwareia;

import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ArchiveS3")
public class ArchiveS3Plugin extends Plugin {
    private static final int BUFFER_SIZE = 8192;
    private static final int MAX_REDIRECTS = 8;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private File resolveSafeFilesDirFile(String relativePath) throws IOException {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            throw new IllegalArgumentException("relativePath é obrigatório.");
        }
        String cleanRel = relativePath.replace('\\', '/').replaceAll("^/+", "");
        File baseDir = getContext().getFilesDir().getCanonicalFile();
        File resolved = new File(baseDir, cleanRel).getCanonicalFile();
        String basePath = baseDir.getPath();
        String targetPath = resolved.getPath();
        if (!targetPath.equals(basePath) && !targetPath.startsWith(basePath + File.separator)) {
            throw new SecurityException("Caminho inválido fora do diretório privado do aplicativo.");
        }
        return resolved;
    }

    private String readErrorSnippet(HttpURLConnection conn) {
        InputStream stream = conn.getErrorStream();
        if (stream == null) {
            try {
                stream = conn.getInputStream();
            } catch (IOException ignored) {
                return "";
            }
        }
        if (stream == null) return "";
        try (InputStream in = stream;
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[512];
            int total = 0;
            int read;
            while (total < 1024 && (read = in.read(buf, 0, Math.min(buf.length, 1024 - total))) != -1) {
                out.write(buf, 0, read);
                total += read;
            }
            return out.toString(StandardCharsets.UTF_8.name()).trim();
        } catch (IOException ignored) {
            return "";
        }
    }

    @PluginMethod
    public void uploadFile(PluginCall call) {
        final String relativePath = call.getString("relativePath");
        final String bucket = call.getString("bucket");
        final String fileName = call.getString("fileName");
        final String accessKey = call.getString("accessKey");
        final String secretKey = call.getString("secretKey");
        final String mimeType = call.getString("mimeType", "audio/mp4");

        if (isEmpty(relativePath) || isEmpty(bucket) || isEmpty(fileName) || isEmpty(accessKey) || isEmpty(secretKey)) {
            call.reject("Parâmetros obrigatórios ausentes para upload IAS3 (relativePath, bucket, fileName, accessKey, secretKey).");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                File sourceFile = resolveSafeFilesDirFile(relativePath);
                if (!sourceFile.exists() || !sourceFile.isFile()) {
                    call.reject("Arquivo local não encontrado para envio: " + relativePath);
                    return;
                }

                String encodedBucket = Uri.encode(bucket);
                String encodedFile = Uri.encode(fileName);
                String endpoint = "https://s3.us.archive.org/" + encodedBucket + "/" + encodedFile;

                conn = (HttpURLConnection) new URL(endpoint).openConnection();
                conn.setRequestMethod("PUT");
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(180000);
                conn.setFixedLengthStreamingMode(sourceFile.length());

                conn.setRequestProperty("Authorization", "LOW " + accessKey + ":" + secretKey);
                conn.setRequestProperty("Content-Type", isEmpty(mimeType) ? "audio/mp4" : mimeType);
                conn.setRequestProperty("x-amz-auto-make-bucket", "1");
                conn.setRequestProperty("x-archive-meta-mediatype", "audio");
                conn.setRequestProperty("x-archive-queue-derive", "0");

                try (InputStream in = new BufferedInputStream(new FileInputStream(sourceFile), BUFFER_SIZE);
                     OutputStream out = new BufferedOutputStream(conn.getOutputStream(), BUFFER_SIZE)) {
                    byte[] buffer = new byte[BUFFER_SIZE];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();
                }

                int status = conn.getResponseCode();
                if (status >= 200 && status < 300) {
                    String audioUrl = "https://archive.org/download/" + encodedBucket + "/" + encodedFile;
                    JSObject result = new JSObject();
                    result.put("status", status);
                    result.put("audioUrl", audioUrl);
                    call.resolve(result);
                } else {
                    String snippet = readErrorSnippet(conn);
                    call.reject("Erro ao enviar áudio para Archive.org (HTTP " + status + ")" + (snippet.isEmpty() ? "" : ": " + snippet));
                }
            } catch (Exception e) {
                call.reject("Falha no upload nativo Archive.org: " + e.getMessage(), e);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void downloadFile(PluginCall call) {
        final String urlStr = call.getString("url");
        final String relativePath = call.getString("relativePath");

        if (isEmpty(urlStr) || isEmpty(relativePath)) {
            call.reject("Parâmetros url e relativePath são obrigatórios para download offline.");
            return;
        }

        executor.execute(() -> {
            File partFile = null;
            HttpURLConnection conn = null;
            try {
                if (!urlStr.startsWith("https://") && !urlStr.startsWith("http://")) {
                    call.reject("URL de download inválida.");
                    return;
                }

                File destFile = resolveSafeFilesDirFile(relativePath);
                File parentDir = destFile.getParentFile();
                if (parentDir != null && !parentDir.exists() && !parentDir.mkdirs()) {
                    call.reject("Não foi possível criar diretório local para o áudio.");
                    return;
                }

                URL currentUrl = new URL(urlStr);
                int redirects = 0;

                while (true) {
                    conn = (HttpURLConnection) currentUrl.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(120000);
                    conn.setRequestMethod("GET");

                    int status = conn.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_PERM
                            || status == HttpURLConnection.HTTP_MOVED_TEMP
                            || status == HttpURLConnection.HTTP_SEE_OTHER
                            || status == 307
                            || status == 308) {
                        if (redirects >= MAX_REDIRECTS) {
                            call.reject("Muitos redirecionamentos ao baixar áudio do Archive.org.");
                            return;
                        }
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        conn = null;
                        if (isEmpty(location)) {
                            call.reject("Redirecionamento sem cabeçalho Location ao baixar áudio.");
                            return;
                        }
                        currentUrl = new URL(currentUrl, location);
                        redirects++;
                        continue;
                    }

                    if (status < 200 || status >= 300) {
                        String snippet = readErrorSnippet(conn);
                        call.reject("Erro ao baixar áudio (HTTP " + status + ")" + (snippet.isEmpty() ? "" : ": " + snippet));
                        return;
                    }
                    break;
                }

                partFile = new File(destFile.getParentFile(), destFile.getName() + ".part");
                try (InputStream in = new BufferedInputStream(conn.getInputStream(), BUFFER_SIZE);
                     OutputStream out = new BufferedOutputStream(new FileOutputStream(partFile), BUFFER_SIZE)) {
                    byte[] buffer = new byte[BUFFER_SIZE];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();
                }

                if (destFile.exists() && !destFile.delete()) {
                    call.reject("Não foi possível substituir arquivo offline existente.");
                    return;
                }
                if (!partFile.renameTo(destFile)) {
                    call.reject("Não foi possível finalizar arquivo offline baixado.");
                    return;
                }
                partFile = null;

                JSObject result = new JSObject();
                result.put("sizeBytes", destFile.length());
                result.put("relativePath", relativePath);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Falha ao baixar áudio offline: " + e.getMessage(), e);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
                if (partFile != null && partFile.exists()) {
                    // Cleanup partial file on error
                    partFile.delete();
                }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    private static boolean isEmpty(String s) {
        return s == null || s.trim().isEmpty();
    }
}
