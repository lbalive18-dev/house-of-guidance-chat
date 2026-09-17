<?php

namespace App\Filesystems;

use Illuminate\Support\Facades\Http;
use League\Flysystem\Config;
use League\Flysystem\DirectoryAttributes;
use League\Flysystem\FileAttributes;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\PathPrefixer;
use League\Flysystem\UnableToCheckExistence;
use League\Flysystem\UnableToCopyFile;
use League\Flysystem\UnableToDeleteDirectory;
use League\Flysystem\UnableToDeleteFile;
use League\Flysystem\UnableToMoveFile;
use League\Flysystem\UnableToReadFile;
use League\Flysystem\UnableToRetrieveMetadata;
use League\Flysystem\UnableToWriteFile;

/**
 * Flysystem adapter for Supabase Storage over its REST API.
 *
 * Exists so persistent uploads (avatars, attachments, voice notes) survive
 * on hosts with ephemeral local disks (Render free tier) without adding
 * Composer packages: plain HTTPS via Laravel's HTTP client, using a
 * service-role key that lives only in SUPABASE_SERVICE_KEY.
 *
 * Buckets are created PUBLIC in the Supabase dashboard, mirroring today's
 * public/storage symlink behavior exactly (same URLs shape, same access).
 * Signed/private URLs are a future step, not a silent behavior change.
 */
class SupabaseStorageAdapter implements FilesystemAdapter
{
    private PathPrefixer $prefixer;

    public function __construct(
        private readonly string $baseUrl,
        private readonly string $serviceKey,
        private readonly string $bucket,
        string $prefix = '',
        private readonly string $publicUrl = '',
    ) {
        $this->prefixer = new PathPrefixer(trim($prefix, '/'), '/');
    }

    public function publicUrl(string $path): string
    {
        $base = rtrim($this->publicUrl !== '' ? $this->publicUrl : $this->baseUrl.'/storage/v1/object/public', '/');

        return $base.'/'.$this->bucket.'/'.$this->prefixer->prefixPath(ltrim($path, '/'));
    }

    public function fileExists(string $path): bool
    {
        try {
            $item = $this->findObject($path);

            return $item !== null;
        } catch (\Throwable) {
            throw new UnableToCheckExistence('Unable to check existence for: '.$path);
        }
    }

    public function directoryExists(string $path): bool
    {
        return true;
    }

    public function write(string $path, string $contents, Config $config): void
    {
        $this->upload($path, $contents, $this->detectMimeType($path, $contents));
    }

    public function writeStream(string $path, $contents, Config $config): void
    {
        $this->upload($path, stream_get_contents($contents), $this->detectMimeType($path, ''));
    }

    public function read(string $path): string
    {
        $response = Http::timeout(30)
            ->withHeaders($this->authHeaders())
            ->get($this->objectUrl($path));

        if (! $response->successful()) {
            throw UnableToReadFile::fromLocation($path, 'Supabase object not found.');
        }

        return (string) $response->body();
    }

    public function readStream(string $path)
    {
        $stream = fopen('php://temp', 'w+');

        if ($stream === false) {
            throw UnableToReadFile::fromLocation($path, 'Unable to open temporary stream.');
        }

        fwrite($stream, $this->read($path));
        rewind($stream);

        return $stream;
    }

    public function delete(string $path): void
    {
        $response = Http::timeout(30)
            ->withHeaders($this->authHeaders())
            ->delete($this->objectUrl($path));

        if (! $response->successful()) {
            throw UnableToDeleteFile::atLocation($path, 'Supabase delete failed.');
        }
    }

    public function deleteDirectory(string $path): void
    {
        $prefix = trim($this->prefixer->prefixPath(trim($path, '/')), '/');

        foreach ($this->listObjects($prefix === '' ? null : $prefix.'/', 1000) as $item) {
            $this->delete($item['name']);
        }
    }

    public function createDirectory(string $path, Config $config): void
    {
        // Flat object namespace: directories are implied by key prefixes.
    }

    public function setVisibility(string $path, string $visibility): void
    {
        // Visibility lives at the bucket level (public buckets mirror the
        // previous public/storage symlink). Per-object ACLs are a future step.
    }

    public function visibility(string $path): FileAttributes
    {
        return new FileAttributes($path, null, 'public');
    }

    public function mimeType(string $path): FileAttributes
    {
        $item = $this->findObject($path);

        if ($item === null) {
            throw UnableToRetrieveMetadata::mimeType($path, 'Object not found.');
        }

        return new FileAttributes($path, null, null, null, $item['mime'] ?? null);
    }

    public function lastModified(string $path): FileAttributes
    {
        $item = $this->findObject($path);

        if ($item === null) {
            throw UnableToRetrieveMetadata::lastModified($path, 'Object not found.');
        }

        $timestamp = isset($item['updated_at']) ? strtotime((string) $item['updated_at']) : false;

        return new FileAttributes($path, null, null, $timestamp === false ? null : $timestamp);
    }

    public function fileSize(string $path): FileAttributes
    {
        $item = $this->findObject($path);

        if ($item === null) {
            throw UnableToRetrieveMetadata::fileSize($path, 'Object not found.');
        }

        return new FileAttributes($path, (int) ($item['size'] ?? 0));
    }

    public function listContents(string $path, bool $deep): iterable
    {
        $prefix = trim($this->prefixer->prefixPath(trim($path, '/')), '/');

        foreach ($this->listObjects($prefix === '' ? null : $prefix.'/', 100) as $item) {
            yield new FileAttributes(
                $item['name'],
                (int) ($item['size'] ?? 0),
                null,
                isset($item['updated_at']) ? strtotime((string) $item['updated_at']) ?: null : null,
                $item['mime'] ?? null
            );
        }

        yield from [];
    }

    public function move(string $source, string $destination, Config $config): void
    {
        $response = Http::timeout(30)
            ->withHeaders($this->authHeaders())
            ->post(rtrim($this->baseUrl, '/').'/storage/v1/object/move', [
                'bucket' => $this->bucket,
                'sourceKey' => $this->prefixed($source),
                'destinationKey' => $this->prefixed($destination),
            ]);

        if (! $response->successful()) {
            throw UnableToMoveFile::fromLocationTo($source, $destination);
        }
    }

    public function copy(string $source, string $destination, Config $config): void
    {
        $response = Http::timeout(30)
            ->withHeaders($this->authHeaders())
            ->post(rtrim($this->baseUrl, '/').'/storage/v1/object/copy', [
                'bucket' => $this->bucket,
                'sourceKey' => $this->prefixed($source),
                'destinationKey' => $this->prefixed($destination),
            ]);

        if (! $response->successful()) {
            throw UnableToCopyFile::fromLocationTo($source, $destination, 'Supabase copy failed.');
        }
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function prefixed(string $path): string
    {
        return $this->prefixer->prefixPath(ltrim($path, '/'));
    }

    private function objectUrl(string $path): string
    {
        return rtrim($this->baseUrl, '/').'/storage/v1/object/'.$this->bucket.'/'.$this->prefixed($path);
    }

    /** @return array<string, string> */
    private function authHeaders(): array
    {
        return [
            'apikey' => $this->serviceKey,
            'Authorization' => 'Bearer '.$this->serviceKey,
        ];
    }

    private function upload(string $path, string $contents, string $mimeType): void
    {
        $response = Http::timeout(60)
            ->withHeaders($this->authHeaders() + [
                'Content-Type' => $mimeType,
                'x-upsert' => 'true',
            ])
            ->withBody($contents, $mimeType)
            ->put($this->objectUrl($path));

        if (! $response->successful()) {
            throw UnableToWriteFile::atLocation($path, 'Supabase upload failed.');
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function listObjects(?string $prefix, int $limit): array
    {
        $response = Http::timeout(30)
            ->withHeaders($this->authHeaders())
            ->post(rtrim($this->baseUrl, '/').'/storage/v1/object/list/'.$this->bucket, array_filter([
                'prefix' => $prefix,
                'limit' => $limit,
            ]));

        if (! $response->successful()) {
            return [];
        }

        $decoded = $response->json();

        return is_array($decoded) ? $decoded : [];
    }

    /** @return array<string, mixed>|null */
    private function findObject(string $path): ?array
    {
        $name = $this->prefixed($path);
        $directory = str_contains($name, '/') ? substr($name, 0, strrpos($name, '/') + 1) : null;

        foreach ($this->listObjects($directory, 100) as $item) {
            if (($item['name'] ?? null) === $name) {
                return [
                    'name' => $name,
                    'size' => $item['metadata']['size'] ?? 0,
                    'mime' => $item['metadata']['mimetype'] ?? null,
                    'updated_at' => $item['updated_at'] ?? null,
                ];
            }
        }

        return null;
    }

    private function detectMimeType(string $path, string $contents): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $map = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf', 'webm' => 'audio/webm', 'mp3' => 'audio/mpeg',
            'ogg' => 'audio/ogg', 'm4a' => 'audio/mp4', 'wav' => 'audio/wav',
            'mp4' => 'video/mp4', 'txt' => 'text/plain',
        ];

        if (isset($map[$extension])) {
            return $map[$extension];
        }

        if ($contents !== '' && function_exists('finfo_open')) {
            $detected = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);

            if (is_string($detected) && $detected !== '') {
                return $detected;
            }
        }

        return 'application/octet-stream';
    }
}
