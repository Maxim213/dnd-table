# Builds the PLAYER version: GAME\DnD_Game_PLAYERS.html — one file you send to players on Discord.
# Claude runs this after every app change. To run it yourself: right-click -> "Run with PowerShell".
$engine = Split-Path -Parent $MyInvocation.MyCommand.Path   # ...\GAME\_engine
$game   = Split-Path -Parent $engine                         # ...\GAME
$html = Get-Content -Raw -Encoding UTF8 (Join-Path $game 'DnD_Game_DM.html')

$css = Get-Content -Raw -Encoding UTF8 (Join-Path $engine 'app\style.css')
$html = $html.Replace('<link rel="stylesheet" href="_engine/app/style.css">', "<style>`n$css`n</style>")

# player mode switch (must come before the app scripts)
$html = $html.Replace('<!-- Rules data', "<script>window.APP_MODE = 'player';</script>`n<!-- Rules data")

$scripts = 'data/rules.js', 'data/classes.js', 'data/species.js', 'data/spells.js', 'data/monsters.js', 'data/homebrew.js', 'data/help.js', 'data/levels.js', 'data/spells2.js', 'data/spells3.js', 'data/spells4.js', 'data/subclasses.js', 'data/options.js', 'data/items.js', 'data/items2.js', 'data/items3.js', 'data/monsters2.js', 'data/monsters3.js', 'data/monsters4.js', 'data/montypes.js',
           'data/ru/rules.js', 'data/ru/classes.js', 'data/ru/species.js', 'data/ru/spells.js', 'data/ru/monsters.js', 'data/ru/help.js', 'data/ru/ui.js',
           'app/sound.js', 'app/scenario.js', 'app/engine.js', 'app/ui-core.js', 'app/ui-chars.js', 'app/ui-sheet.js', 'app/ui-combat.js', 'app/ui-games.js', 'app/ui-levels.js', 'app/ui-items.js'
foreach ($s in $scripts) {
  $js = Get-Content -Raw -Encoding UTF8 (Join-Path $engine ($s -replace '/', '\'))
  $js = $js.Replace('</script', '<\/script')
  $tag = "<script src=`"_engine/$s`"></script>"
  if (-not $html.Contains($tag)) { Write-Host "WARNING: $s not found in DnD_Game_DM.html"; continue }
  $html = $html.Replace($tag, "<script>`n$js`n</script>")
}
$out = Join-Path $game 'DnD_Game_PLAYERS.html'
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Done: $out"
