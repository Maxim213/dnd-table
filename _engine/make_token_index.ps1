# Lists the pictures in assets/tokens/custom/ into index.json, so the app finds them.
# Name a picture like the creature or hero: "Skeleton.png", "Seraphina.webp" (Cyrillic names work too).
# Run after adding pictures, then publish (commit + push) the GAME folder.
$dir = Join-Path $PSScriptRoot '..\assets\tokens\custom'
$files = Get-ChildItem -Path $dir -File | Where-Object { $_.Extension -match '^\.(png|jpe?g|webp|gif)$' } | Sort-Object Name | ForEach-Object { $_.Name }
$json = '[' + (($files | ForEach-Object { '"' + ($_ -replace '\', '\' -replace '"', '\"') + '"' }) -join ', ') + ']'
[IO.File]::WriteAllText((Join-Path $dir 'index.json'), $json, (New-Object Text.UTF8Encoding $false))
Write-Output ("index.json: " + @($files).Count + " pictures")
