<#
  Zero-dependency local preview server for Windows (PowerShell 5.1+).
  Serves the ./site folder exactly as a static host (Netlify/Vercel) would.

  Usage:
    powershell -ExecutionPolicy Bypass -File serve.ps1
    powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
#>
param(
  [int]$Port = 5173,
  [string]$Root = (Join-Path $PSScriptRoot "site")
)

$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"; ".json" = "application/json"
  ".webmanifest" = "application/manifest+json"; ".xml" = "application/xml"
  ".txt" = "text/plain; charset=utf-8"; ".svg" = "image/svg+xml"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".webp" = "image/webp"; ".ico" = "image/x-icon"
  ".woff2" = "font/woff2"; ".pdf" = "application/pdf"
  ".docx" = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

$rootFull = [System.IO.Path]::GetFullPath($Root)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $rootFull at http://localhost:$Port/  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path.EndsWith("/")) { $path += "index.html" }
      $file = [System.IO.Path]::GetFullPath((Join-Path $rootFull $path.TrimStart("/")))
      if (-not [System.IO.Path]::HasExtension($file) -and (Test-Path "$file.html" -PathType Leaf)) { $file = "$file.html" }

      $status = 200
      $inside = $file.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)
      if (-not $inside -or -not (Test-Path $file -PathType Leaf)) {
        $status = 404
        $file = Join-Path $rootFull "404.html"
      }

      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
      $res.StatusCode = $status
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $res.Headers.Add("Cache-Control", "no-cache")
      $res.ContentLength64 = $bytes.Length
      if ($req.HttpMethod -ne "HEAD") { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      Write-Host ("{0} {1} {2}" -f $status, $req.HttpMethod, $req.Url.AbsolutePath)
    }
    catch {
      $res.StatusCode = 500
      Write-Host "500 $($req.Url.AbsolutePath): $_"
    }
    finally {
      $res.OutputStream.Close()
    }
  }
}
finally {
  $listener.Stop()
}
