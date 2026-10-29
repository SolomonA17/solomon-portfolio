<#
  Generates preview covers for GitHub projects that have no UI to screenshot
  (C / Python coursework) or whose live demo is down (SolarVue).
  Every line of code shown is copied from the repository; diagrams are labelled
  as illustrations. Output: site/assets/img/projects/*.png (1200x750).

  Usage: powershell -ExecutionPolicy Bypass -File tools/generate-project-covers.ps1
  (PowerShell 5.1 reads BOM-less scripts as ANSI, so this file is ASCII-only.)
#>
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot "..\site\assets\img\projects"
New-Item -ItemType Directory -Force $out | Out-Null

# Canvas size. Note: PowerShell variables are case-insensitive, so never reuse $cw/$ch below.
$cw = 1200; $ch = 750
$px = [System.Drawing.GraphicsUnit]::Pixel
$regular = [System.Drawing.FontStyle]::Regular
$bold = [System.Drawing.FontStyle]::Bold

function C($hex, [int]$a = 255) { $c = [System.Drawing.ColorTranslator]::FromHtml($hex); [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B) }
function B($hex, [int]$a = 255) { New-Object System.Drawing.SolidBrush (C $hex $a) }
function P($hex, [float]$w = 1, [int]$a = 255) { New-Object System.Drawing.Pen (C $hex $a), $w }
function F([string]$family, [float]$size, $style = $regular) { New-Object System.Drawing.Font $family, $size, $style, $px }

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); return $p
}

function New-Cover {
  $bmp = New-Object System.Drawing.Bitmap $cw, $ch
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear((C "#0b0b0b"))
  $dot = B "#ffffff" 18
  for ($y = 18; $y -lt $ch; $y += 28) { for ($x = 18; $x -lt $cw; $x += 28) { $g.FillEllipse($dot, $x, $y, 2, 2) } }
  return @($bmp, $g)
}

# Terminal/editor window with title bar; returns the content origin.
function Window($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$title) {
  $g.FillPath((B "#151515"), (RoundRect $x $y $w $h 26))
  $g.FillEllipse((B "#d1ffca"), ($x + 24), ($y + 22), 14, 14)
  $g.FillEllipse((B "#fff100"), ($x + 46), ($y + 22), 14, 14)
  $g.FillEllipse((B "#3a3a3a"), ($x + 68), ($y + 22), 14, 14)
  $g.DrawString($title, (F "Consolas" 17), (B "#8a8a8a"), ($x + 96), ($y + 18))
  $g.DrawLine((P "#262626" 1), $x, ($y + 58), ($x + $w), ($y + 58))
}

# Minimal syntax colouring: keywords mint, strings yellow, comments grey.
$keywords = "typedef|struct|void|int|char|unsigned|extern|return|def|for|in|if|else|import|range|True|False|None"
function CodeLine($g, [string]$line, [float]$x, [float]$y, [float]$size) {
  $font = F "Consolas" $size
  $fmt = [System.Drawing.StringFormat]::GenericTypographic.Clone()
  $fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
  $tokens = [regex]::Matches($line, '("[^"]*"|#.*$|\w+|\s+|.)')
  $cx = $x
  foreach ($t in $tokens) {
    $s = $t.Value
    $col = "#e8e8e8"
    if ($s -match '^#') { $col = "#6f6f6f" }
    elseif ($s -match '^"') { $col = "#fff100" }
    elseif ($s -match "^($keywords)$") { $col = "#d1ffca" }
    elseif ($s -match '^[\{\}\(\)\[\];,\*]$') { $col = "#9a9a9a" }
    $g.DrawString($s, $font, (B $col), $cx, $y, $fmt)
    $cx += $g.MeasureString($s, $font, 2000, $fmt).Width
  }
}

function Tag($g, [string]$text) {
  $font = F "Consolas" 15
  $size = $g.MeasureString($text, $font)
  $x = $cw - $size.Width - 70; $y = $ch - 58
  $g.DrawPath((P "#3a3a3a" 1.5), (RoundRect ($x - 14) ($y - 8) ($size.Width + 28) 36 18))
  $g.DrawString($text, $font, (B "#9a9a9a"), $x, $y)
}

function Save($c, [string]$name) {
  $c[0].Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $c[1].Dispose(); $c[0].Dispose()
}

# ---- Monty: real struct definitions + opcode table from monty.h / file_tools.c
$c = New-Cover; $g = $c[1]
Window $g 60 56 700 600 "monty.h"
$code = @(
  "typedef struct stack_s",
  "{",
  "        int n;",
  "        struct stack_s *prev;",
  "        struct stack_s *next;",
  "} stack_t;",
  "",
  "typedef struct instruction_s",
  "{",
  "        char *opcode;",
  "        void (*f)(stack_t **stack,",
  "                  unsigned int line_number);",
  "} instruction_t;"
)
for ($i = 0; $i -lt $code.Count; $i++) { CodeLine $g $code[$i] 92 (138 + $i * 36) 22 }
$ops = @("push","pall","pint","pop","swap","add","sub","div","mul","mod","nop","pchar","pstr","rotl","rotr")
$g.DrawString("OPCODES", (F "Consolas" 16), (B "#8a8a8a"), 812, 70)
for ($i = 0; $i -lt $ops.Count; $i++) {
  $col = [math]::Floor($i / 8); $row = $i % 8
  $bx = 812 + $col * 168; $by = 104 + $row * 54
  $g.FillPath((B "#1c1c1c"), (RoundRect $bx $by 150 40 20))
  $g.DrawString($ops[$i], (F "Consolas" 19), (B $(if ($i -eq 0) { "#0b0b0b" } else { "#e8e8e8" })), ($bx + 18), ($by + 8))
  if ($i -eq 0) { $g.FillPath((B "#d1ffca"), (RoundRect $bx $by 150 40 20)); $g.DrawString($ops[$i], (F "Consolas" 19), (B "#0b0b0b"), ($bx + 18), ($by + 8)) }
}
$g.DrawString("15 opcodes dispatched via instruction_t", (F "Segoe UI" 17), (B "#8a8a8a"), 812, 548)
Tag $g "CODE PREVIEW / FROM REPO"
Save $c "monty.png"

# ---- Sorting algorithms: Big-O table from the repo's *-O files + illustrative bars
$c = New-Cover; $g = $c[1]
Window $g 60 56 720 638 "sorting_algorithms / *-O"
$rows = @(
  @("bubble_sort", "O(n)", "O(n^2)", "O(n^2)"),
  @("insertion_sort_list", "O(n)", "O(n^2)", "O(n^2)"),
  @("selection_sort", "O(n^2)", "O(n^2)", "O(n^2)"),
  @("quick_sort", "O(nlog(n))", "O(nlog(n))", "O(n^2)"),
  @("cocktail_sort_list", "O(n)", "O(n^2)", "O(n^2)"),
  @("counting_sort", "O(n+k)", "O(n+k)", "O(n+k)"),
  @("merge_sort", "O(nlog(n))", "O(nlog(n))", "O(nlog(n))"),
  @("heap_sort", "O(nlog(n))", "O(nlog(n))", "O(nlog(n))"),
  @("bitonic_sort", "O(log^2(n))", "O(log^2(n))", "O(log^2(n))"),
  @("quick_sort_hoare", "O(nlog(n))", "O(nlog(n))", "O(n^2)")
)
$hf = F "Consolas" 15
$g.DrawString("FUNCTION", $hf, (B "#6f6f6f"), 92, 84 + 40); $g.DrawString("BEST", $hf, (B "#6f6f6f"), 360, 124)
$g.DrawString("AVERAGE", $hf, (B "#6f6f6f"), 500, 124); $g.DrawString("WORST", $hf, (B "#6f6f6f"), 640, 124)
for ($i = 0; $i -lt $rows.Count; $i++) {
  $y = 160 + $i * 50
  $g.DrawLine((P "#222222" 1), 92, ($y - 10), 750, ($y - 10))
  $g.DrawString($rows[$i][0], (F "Consolas" 19), (B "#d1ffca"), 92, $y)
  for ($k = 1; $k -le 3; $k++) { $g.DrawString($rows[$i][$k], (F "Consolas" 17), (B "#e8e8e8"), (360 + ($k - 1) * 140), ($y + 2)) }
}
$heights = @(120, 210, 160, 300, 90, 260, 340, 190, 380, 140, 230, 420)
for ($i = 0; $i -lt $heights.Count; $i++) {
  $barH = $heights[$i]; $x = 820 + $i * 28
  $col = $(if ($i -eq 8) { "#fff100" } elseif ($i -ge 10) { "#d1ffca" } else { "#3a3a3a" })
  $g.FillRectangle((B $col), $x, (560 - $barH), 20, $barH)
}
$g.DrawString("illustration", (F "Consolas" 15), (B "#6f6f6f"), 820, 580)
Tag $g "BIG-O FROM REPO / C"
Save $c "sorting-algorithms.png"

# ---- Binary trees: function groups from binary_trees.h + illustrative AVL diagram
$c = New-Cover; $g = $c[1]
Window $g 60 56 700 638 "binary_trees.h"
$groups = @(
  @("traverse", "preorder  inorder  postorder  levelorder"),
  @("measure", "height  depth  size  leaves  balance"),
  @("check", "is_full  is_perfect  is_complete  is_bst  is_avl"),
  @("relatives", "sibling  uncle  binary_trees_ancestor"),
  @("rotate", "rotate_left  rotate_right"),
  @("bst", "bst_insert  bst_search  bst_remove  array_to_bst"),
  @("avl", "avl_insert  avl_remove  array_to_avl"),
  @("", "sorted_array_to_avl")
)
for ($i = 0; $i -lt $groups.Count; $i++) {
  $y = 112 + $i * 62
  $g.DrawString($groups[$i][0], (F "Consolas" 15), (B "#6f6f6f"), 92, ($y + 26))
  $g.DrawString($groups[$i][1], (F "Consolas" 18), (B "#e8e8e8"), 200, ($y + 24))
}
$nodes = @{ "a" = @(975, 170); "b" = @(870, 300); "c" = @(1080, 300); "d" = @(815, 430); "e" = @(925, 430); "f" = @(1030, 430); "g" = @(1135, 430) }
$edges = @(@("a","b"), @("a","c"), @("b","d"), @("b","e"), @("c","f"), @("c","g"))
foreach ($e in $edges) { $p1 = $nodes[$e[0]]; $p2 = $nodes[$e[1]]; $g.DrawLine((P "#3a3a3a" 3), $p1[0], $p1[1], $p2[0], $p2[1]) }
$vals = @{ "a" = "50"; "b" = "30"; "c" = "70"; "d" = "20"; "e" = "40"; "f" = "60"; "g" = "80" }
foreach ($k in $nodes.Keys) {
  $p = $nodes[$k]; $fill = $(if ($k -eq "a") { "#d1ffca" } else { "#1c1c1c" })
  $g.FillEllipse((B $fill), ($p[0] - 34), ($p[1] - 34), 68, 68)
  $g.DrawEllipse((P "#4a4a4a" 2), ($p[0] - 34), ($p[1] - 34), 68, 68)
  $fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = "Center"; $fmt.LineAlignment = "Center"
  $g.DrawString($vals[$k], (F "Consolas" 20 $bold), (B $(if ($k -eq "a") { "#0b0b0b" } else { "#e8e8e8" })), (New-Object System.Drawing.RectangleF ($p[0] - 34), ($p[1] - 34), 68, 68), $fmt)
}
$g.DrawString("balanced BST / illustration", (F "Consolas" 15), (B "#6f6f6f"), 820, 500)
Tag $g "CODE PREVIEW / C"
Save $c "binary-trees.png"

# ---- ALX interview: real N-Queens excerpt + a valid 4x4 solution
$c = New-Cover; $g = $c[1]
Window $g 60 56 720 638 "0x05-nqueens/0-nqueens.py"
$code = @(
  "",
  "def is_position_safe(board, i, j, r):",
  '    """Checks if the position is safe for the queen"""',
  "    return board[i] in (j, j - i + r, i - r + j)",
  "",
  "",
  "def safe_positions(board, row, n):",
  "    if row == n:",
  "        print_board(board, n)",
  "    else:",
  "        for j in range(n):",
  "            allowed = True",
  "            for i in range(row):",
  "                if is_position_safe(board, i, j, row):",
  "                    allowed = False",
  "            if allowed:",
  "                board[row] = j",
  "                safe_positions(board, row + 1, n)"
)
$code = $code[0..4] + $code[6..($code.Count - 1)]   # keep one blank line between the functions
for ($i = 0; $i -lt $code.Count; $i++) { CodeLine $g $code[$i] 92 (90 + $i * 32) 18 }
$solution = @(1, 3, 0, 2)
$size = 74; $ox = 840; $oy = 150
for ($r = 0; $r -lt 4; $r++) { for ($col = 0; $col -lt 4; $col++) {
  $fill = $(if ((($r + $col) % 2) -eq 0) { "#1c1c1c" } else { "#151515" })
  $g.FillRectangle((B $fill), ($ox + $col * $size), ($oy + $r * $size), $size, $size)
  if ($solution[$r] -eq $col) { $g.FillEllipse((B "#d1ffca"), ($ox + $col * $size + 18), ($oy + $r * $size + 18), 38, 38) }
} }
$g.DrawRectangle((P "#3a3a3a" 2), $ox, $oy, ($size * 4), ($size * 4))
$g.DrawString("N = 4 -> [[0, 1], [1, 3], [2, 0], [3, 2]]", (F "Consolas" 15), (B "#8a8a8a"), 830, 470)
$g.DrawString("+ 10 more problems: lockboxes, UTF-8", (F "Segoe UI" 16), (B "#6f6f6f"), 830, 520)
$g.DrawString("validation, log parsing, prime game ...", (F "Segoe UI" 16), (B "#6f6f6f"), 830, 546)
Tag $g "CODE PREVIEW / PYTHON"
Save $c "alx-interview.png"

# ---- SolarVue: illustration of the Three.js scene and the app's real control bar
$c = New-Cover; $g = $c[1]
$g.Clear((C "#03040a"))
$rand = New-Object System.Random 17
for ($i = 0; $i -lt 420; $i++) { $a = $rand.Next(40, 220); $s = $rand.NextDouble() * 2.2 + 0.6; $g.FillEllipse((B "#ffffff" $a), [float]($rand.NextDouble() * $cw), [float]($rand.NextDouble() * $ch), $s, $s) }
$cx = 520; $cy = 470
$radii = @(60, 80, 100, 120, 160, 200, 240, 280, 340)
$planets = @(
  @("#9e9e9e", 6, 40), @("#d9b27c", 9, 200), @("#4f8bd6", 10, 300), @("#c1543a", 8, 120),
  @("#d8b48a", 22, 340), @("#e3c67b", 18, 20), @("#8fd3dc", 13, 230), @("#3f62c9", 12, 150), @("#cfc6bd", 5, 280)
)
for ($i = 0; $i -lt $radii.Count; $i++) {
  $rx = $radii[$i] * 1.55; $ry = $radii[$i] * 0.42
  $g.DrawEllipse((P "#ffffff" 1.2 110), ($cx - $rx), ($cy - $ry), (2 * $rx), (2 * $ry))
}
$glow = New-Object System.Drawing.Drawing2D.GraphicsPath; $glow.AddEllipse(($cx - 120), ($cy - 120), 240, 240)
$pg = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow; $pg.CenterColor = (C "#ffb347" 150); $pg.SurroundColors = @((C "#ff8c00" 0))
$g.FillPath($pg, $glow)
$sun = New-Object System.Drawing.Drawing2D.GraphicsPath; $sun.AddEllipse(($cx - 46), ($cy - 46), 92, 92)
$sb = New-Object System.Drawing.Drawing2D.PathGradientBrush $sun; $sb.CenterColor = (C "#fff4b0"); $sb.SurroundColors = @((C "#f59b23"))
$g.FillPath($sb, $sun)
for ($i = 0; $i -lt $radii.Count; $i++) {
  $ang = $planets[$i][2] * [math]::PI / 180
  $px0 = $cx + [math]::Cos($ang) * $radii[$i] * 1.55; $py0 = $cy + [math]::Sin($ang) * $radii[$i] * 0.42
  $r = $planets[$i][1]
  if ($i -eq 5) { $g.DrawEllipse((P "#e8d5a0" 3 200), ($px0 - $r * 2.1), ($py0 - $r * 0.6), ($r * 4.2), ($r * 1.2)) }
  $pp = New-Object System.Drawing.Drawing2D.GraphicsPath; $pp.AddEllipse(($px0 - $r), ($py0 - $r), (2 * $r), (2 * $r))
  $pb = New-Object System.Drawing.Drawing2D.PathGradientBrush $pp; $pb.CenterPoint = (New-Object System.Drawing.PointF ($px0 - $r * 0.4), ($py0 - $r * 0.4))
  $pb.CenterColor = (C "#ffffff" 230); $pb.SurroundColors = @((C $planets[$i][0]))
  $g.FillPath($pb, $pp)
}
$labels = @("Free Look","Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto")
$bx = 24; $bf = F "Segoe UI" 17
foreach ($t in $labels) {
  $btnW = $g.MeasureString($t, $bf).Width + 22
  $g.FillPath((B $(if ($t -eq "Free Look") { "#0d6efd" } else { "#6c757d" })), (RoundRect $bx 22 $btnW 40 6))
  $g.DrawString($t, $bf, (B "#ffffff"), ($bx + 10), 31)
  $bx += $btnW + 6
}
$g.DrawString("Simulation Speed:", (F "Segoe UI" 17), (B "#ffffff"), 24, 76)
$g.FillPath((B "#dee2e6"), (RoundRect 24 112 150 8 4)); $g.FillEllipse((B "#0d6efd"), 18, 106, 20, 20)
Tag $g "ILLUSTRATION / THREE.JS SCENE"
Save $c "solarvue.png"

Get-ChildItem $out -Filter *.png | Select-Object Name, Length
