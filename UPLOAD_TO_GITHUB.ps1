# Upload source without overwriting Git history or committing local secrets.
$ErrorActionPreference = 'Stop'
$repoUrl = 'https://github.com/sandeshgiri5851803-max/Eco-Rewards.git'
$source = $PSScriptRoot
$target = Join-Path $env:TEMP 'EcoRewards_github_clean_upload'
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git was not found. Install Git for Windows first.' }
    if (Test-Path $target) {
        Write-Host "Old temporary clone detected: $target" -ForegroundColor Yellow
        Write-Host 'Delete that temporary folder manually before trying again. No project files have been changed.'
        exit 1
    }
    git clone $repoUrl $target
    if ($LASTEXITCODE -ne 0) { throw 'Git clone failed. Check your GitHub account/repository access.' }
    function Copy-Source([string]$from,[string]$to) {
        if (!(Test-Path $to)) { New-Item -ItemType Directory -Path $to -Force | Out-Null }
        Copy-Item (Join-Path $from '*') $to -Recurse -Force
    }
    # Preserve the existing top-level backend/frontend structure in GitHub.
    Copy-Source (Join-Path $source 'EcoRewards_v9_Backend\backend') (Join-Path $target 'backend')
    Copy-Source (Join-Path $source 'EcoRewards_v9_Backend\frontend') (Join-Path $target 'frontend')
    Copy-Source (Join-Path $source 'EcoRewards_v9_Backend\tests') (Join-Path $target 'tests')
    Copy-Source (Join-Path $source 'EcoRewards_v9_Backend\docs') (Join-Path $target 'docs')
    Copy-Source (Join-Path $source 'docs') (Join-Path $target 'docs')
    Copy-Source (Join-Path $source 'EcoRewardsMobile') (Join-Path $target 'EcoRewardsMobile')
    Copy-Item (Join-Path $source 'README.md') (Join-Path $target 'README.md') -Force
    Copy-Item (Join-Path $source '.gitignore') (Join-Path $target '.gitignore') -Force
    # Preserve existing startup/data scripts as-is, and copy current versions where present.
    Get-ChildItem (Join-Path $source 'EcoRewards_v9_Backend') -File | Where-Object { $_.Name -notmatch '(\.env|\.db|\.sqlite|\.log)$' } | ForEach-Object { Copy-Item $_.FullName $target -Force }
    Push-Location $target
    try {
        git status --short
        Write-Host "`nReview changes above. Nothing is uploaded yet." -ForegroundColor Cyan
        $confirm = Read-Host 'Type YES to commit and push the organised EcoRewards source'
        if ($confirm -cne 'YES') { Write-Host 'Cancelled. No commit pushed.'; exit 0 }
        git add -A
        # Double-check that sensitive local settings have not accidentally been staged.
        $staged = git diff --cached --name-only
        if ($staged | Select-String '(^|/)(\.env($|\.)|uploads/|node_modules/)|\.(db|sqlite3?|log)$') { throw 'A private/generated file is staged; upload cancelled. Inspect git status.' }
        git diff --cached --quiet
        if ($LASTEXITCODE -eq 0) { Write-Host 'No changes to commit.'; exit 0 }
        git commit -m 'Organise EcoRewards mobile and Flask source with developer comments'
        if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Configure your Git author name/email first.' }
        git push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw 'Push failed. Your local commit remains in the temporary folder.' }
        Write-Host "Upload completed: https://github.com/sandeshgiri5851803-max/Eco-Rewards" -ForegroundColor Green
    } finally { Pop-Location }
} catch { Write-Host ("UPLOAD STOPPED: " + $_.Exception.Message) -ForegroundColor Red; exit 1 }
