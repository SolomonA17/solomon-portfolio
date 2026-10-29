<#
  Regenerates the raster brand assets in site/assets/img (Windows, PowerShell 5.1+):
    og-image.png (1200x630), apple-touch-icon.png (180), icon-512.png, favicon-32.png
  Uses System.Drawing and the Bahnschrift / Consolas / Segoe UI fonts that ship with Windows.

  Usage: powershell -ExecutionPolicy Bypass -File tools/generate-images.ps1
#>
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot "..\site\assets\img"
New-Item -ItemType Directory -Force $out | Out-Null

function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush($hex) { New-Object System.Drawing.SolidBrush (Color $hex) }

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return @($bmp, $g)
}

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Pt([float]$x, [float]$y) { New-Object System.Drawing.PointF $x, $y }

# Isometric block: top, left and right faces with light speckle texture.
function Draw-Block($g, [float]$cx, [float]$cy, [float]$s, $top, $left, $right, [int]$seed, [string]$texture) {
  $w = $s * 0.866; $h = $s * 0.5
  $faces = @(
    @{ pts = @((Pt $cx ($cy - $h)), (Pt ($cx + $w) $cy), (Pt $cx ($cy + $h)), (Pt ($cx - $w) $cy)); c = $top },
    @{ pts = @((Pt ($cx - $w) $cy), (Pt $cx ($cy + $h)), (Pt $cx ($cy + $h + $s)), (Pt ($cx - $w) ($cy + $s))); c = $left },
    @{ pts = @((Pt $cx ($cy + $h)), (Pt ($cx + $w) $cy), (Pt ($cx + $w) ($cy + $s)), (Pt $cx ($cy + $h + $s))); c = $right }
  )
  $rand = New-Object System.Random $seed
  foreach ($f in $faces) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddPolygon([System.Drawing.PointF[]]$f.pts)
    $g.FillPath((Brush $f.c), $path)
    if ($texture) {
      $g.SetClip($path)
      $b = $path.GetBounds()
      if ($texture -eq "wood") {
        $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 90, 55, 20)), 1.4
        for ($i = 0; $i -lt 26; $i++) {
          $yy = $b.Top + $rand.NextDouble() * $b.Height
          $g.DrawBezier($pen, $b.Left, $yy, $b.Left + $b.Width * 0.3, $yy + 6, $b.Left + $b.Width * 0.7, $yy - 6, $b.Right, $yy + 2)
        }
      } else {
        for ($i = 0; $i -lt [int]($b.Width * $b.Height / 90); $i++) {
          $a = $rand.Next(10, 46)
          $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 0, 0, 0))
          $g.FillEllipse($dot, [float]($b.Left + $rand.NextDouble() * $b.Width), [float]($b.Top + $rand.NextDouble() * $b.Height), 1.8, 1.8)
        }
      }
      $g.ResetClip()
    }
  }
}

# Text printed on a block's left face (sheared to the isometric plane).
function Stamp($g, [string]$text, [float]$cx, [float]$cy, [float]$s, $font, $color) {
  $w = $s * 0.866; $h = $s * 0.5
  $state = $g.Save()
  $m = New-Object System.Drawing.Drawing2D.Matrix 1, 0.577, 0, 1, ($cx - $w + $s * 0.08), ($cy + $s * 0.62)
  $g.MultiplyTransform($m)
  $g.DrawString($text, $font, (Brush $color), 0, 0)
  $g.Restore($state)
}

$px = [System.Drawing.GraphicsUnit]::Pixel
$condensed = "Bahnschrift SemiBold Condensed"
$bold = [System.Drawing.FontStyle]::Bold
$regular = [System.Drawing.FontStyle]::Regular

# ---- Open Graph image --------------------------------------------------------
$c = New-Canvas 1200 630; $bmp = $c[0]; $g = $c[1]
$g.Clear((Color "#e5e5e5"))

$mono = New-Object System.Drawing.Font "Consolas", 17, $regular, $px
$g.FillEllipse((Brush "#fff100"), 72, 79, 11, 11)
# Non-ASCII characters are built from code points: PowerShell 5.1 reads BOM-less scripts as ANSI.
$dash = [string][char]0x2014
$middot = [string][char]0x00B7
$g.DrawString("SOLOMON ABERRA MELESSE  $dash  FRONT-END DEVELOPER & TECHNICAL SEO", $mono, (Brush "#444444"), 92, 73)

$display = New-Object System.Drawing.Font $condensed, 132, $bold, $px
$lines = @("FAST.", "CRAWLABLE.", "MEASURABLE.")
for ($i = 0; $i -lt $lines.Count; $i++) {
  $g.DrawString($lines[$i], $display, (Brush "#000000"), 62, (118 + $i * 118))
}

$pillFont = New-Object System.Drawing.Font "Consolas", 16, $regular, $px
$g.FillPath((Brush "#d1ffca"), (RoundRect 72 524 196 40 20))
$g.FillEllipse((Brush "#000000"), 90, 540, 8, 8)
$g.DrawString("OPEN TO REMOTE", $pillFont, (Brush "#000000"), 106, 534)
$sans = New-Object System.Drawing.Font "Segoe UI Semibold", 20, $regular, $px
$g.DrawString("React $middot Next.js $middot TypeScript $middot Core Web Vitals", $sans, (Brush "#444444"), 288, 530)

Draw-Block $g 975 190 172 "#ececea" "#c9c7c3" "#b3b1ad" 7 "concrete"
Draw-Block $g 962 148 56 "#e6ffe1" "#c4f2bc" "#aedfa6" 9 ""
Draw-Block $g 1100 362 110 "#e8cb9f" "#cfae7f" "#b8966a" 3 "wood"
Draw-Block $g 1112 322 34 "#fff86b" "#fff100" "#e0d400" 11 ""
Draw-Block $g 772 428 86 "#4a4a4a" "#2a2a2a" "#1c1c1c" 5 "concrete"
$stampFont = New-Object System.Drawing.Font $condensed, 40, $bold, $px
Stamp $g "NEXT.JS" 975 190 172 $stampFont "#1a1a1a"
$stampSmall = New-Object System.Drawing.Font $condensed, 26, $bold, $px
Stamp $g "SEO" 772 428 86 $stampSmall "#f3f3f3"
Stamp $g "REACT" 1100 362 110 $stampSmall "#3a240e"

$bmp.Save((Join-Path $out "og-image.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ---- Icons -------------------------------------------------------------------
function Save-Icon([int]$size, [string]$name, [bool]$rounded) {
  $c = New-Canvas $size $size; $bmp = $c[0]; $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($rounded) { $g.FillPath((Brush "#000000"), (RoundRect 0 0 $size $size ($size * 0.22))) }
  else { $g.Clear((Color "#000000")) }
  $font = New-Object System.Drawing.Font $condensed, ($size * 0.5), $bold, $px
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF 0, ($size * 0.03), $size, $size
  $g.DrawString("SA", $font, (Brush "#ffffff"), $rect, $fmt)
  $dot = $size * 0.13
  $g.FillEllipse((Brush "#fff100"), ($size * 0.74), ($size * 0.13), $dot, $dot)
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Save-Icon 180 "apple-touch-icon.png" $false
Save-Icon 512 "icon-512.png" $false
Save-Icon 192 "icon-192.png" $true
Save-Icon 32 "favicon-32.png" $true

# favicon.ico at the site root (browsers request it by default): an ICO container around the 32px PNG.
$png = [System.IO.File]::ReadAllBytes((Join-Path $out "favicon-32.png"))
$ico = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter $ico
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)        # header: reserved, type=icon, count
$w.Write([Byte]32); $w.Write([Byte]32); $w.Write([Byte]0); $w.Write([Byte]0)
$w.Write([UInt16]1); $w.Write([UInt16]32)                             # planes, bits per pixel
$w.Write([UInt32]$png.Length); $w.Write([UInt32]22)                   # size, offset
$w.Write($png); $w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $out "..\..\favicon.ico"), $ico.ToArray())

Get-ChildItem $out | Select-Object Name, Length
