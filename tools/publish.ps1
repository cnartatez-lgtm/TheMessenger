param([ValidateSet('Create','Release','Pages','Status')][string]$Action = 'Status')
$ErrorActionPreference='Stop'
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='Never'
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$credentialValues=@{}
foreach($line in $credentialLines) { if($line -match '^([^=]+)=(.*)$') { $credentialValues[$matches[1]]=$matches[2] } }
if(-not $credentialValues.password) { throw 'GitHub credential unavailable.' }
$headers=@{Authorization="Bearer $($credentialValues.password)";Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$repo='cnartatez-lgtm/TheMessenger'
$api="https://api.github.com/repos/$repo"
$tag='demo-0.1.0-20261116'
function Get-Optional($url) {
  try { Invoke-RestMethod $url -Headers $headers } catch {
    if([int]$_.Exception.Response.StatusCode -ne 404) { throw }
    return $null
  }
}
if($Action -eq 'Create') {
  $existing=Get-Optional $api
  if(-not $existing) {
    $body=@{name='TheMessenger';description='The Messenger — an Android adventure demo from EIC Kids Ministry. Official website and demo downloads.';private=$false;has_issues=$true;auto_init=$false;homepage='https://cnartatez-lgtm.github.io/TheMessenger/'}|ConvertTo-Json
    $existing=Invoke-RestMethod 'https://api.github.com/user/repos' -Method Post -Headers $headers -ContentType 'application/json' -Body $body
  }
  if($existing.private) { throw 'Existing destination is private; refusing to change its visibility.' }
  $existing|Select-Object full_name,private,html_url
}
if($Action -eq 'Release') {
  $apk=Join-Path $PSScriptRoot '../../BibleJourneyGame/Builds/Android/TheMessenger-Android.apk'
  $apk=(Resolve-Path -LiteralPath $apk).Path
  $expected='D4827796DAC684FE29C5D2960A644C5A36B4E7368572E5CD6A36FC0C8F9E6C81'
  if((Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash -ne $expected){ throw 'APK changed since scanning.' }
  $release=Get-Optional "$api/releases/tags/$tag"
  if(-not $release){
    $notes=@'
## The Messenger — Android development demo

Explore the city as Tychicus, cross its rooftops and deliver the letter. This build includes the parchment HUD, circular icon-only touch controls, sound effects, music and the Elder walking animation.

- Version 0.1.0; build 16 November 2026
- Android 7.1+ (API 25), ARM64; English; landscape
- 144,548,998 bytes (137.85 MiB)
- Tested on Samsung Galaxy Note20 Ultra / Android 13. Other devices may vary.

### Scan of this exact file
VirusTotal on 17 November 2026: **0 / 66 detections**. Eight additional engines could not process this file type.
[View the public report](https://www.virustotal.com/gui/file/d4827796dac684fe29c5d2960a644c5a36b4e7368572e5cd6a36fc0c8f9e6c81).

SHA-256: `d4827796dac684fe29c5d2960a644c5a36b4e7368572e5cd6a36fc0c8f9e6c81`

This scan is not a security certification, vulnerability audit or guarantee of safety.

### Demo notice
This experimental build is under active development and is provided as is, without warranties. Install and use at your own discretion and risk. Bugs, unfinished content and compatibility issues are possible. To the extent permitted by applicable law, the creators and ministry are not liable for damage, data loss or other issues arising from its use. This notice does not exclude rights or liabilities that cannot legally be excluded. Children should have a parent or guardian's permission.

Created by Christian Nartatez under the leadership and direction of the pastors of EIC Paris, for EIC Kids Ministry.
'@
    $body=@{tag_name=$tag;target_commitish='main';name='The Messenger — Android Demo 0.1.0';body=$notes;draft=$true;prerelease=$true}|ConvertTo-Json
    $release=Invoke-RestMethod "$api/releases" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
  }
  $uploadBase=$release.upload_url -replace '\{.*$',''
  foreach($path in @($apk,(Join-Path $PSScriptRoot '../SHA256SUMS.txt'))) {
    $name=Split-Path $path -Leaf
    $asset=$release.assets|Where-Object name -eq $name
    if(-not $asset) {
      $asset=Invoke-RestMethod "${uploadBase}?name=$name" -Method Post -Headers $headers -ContentType 'application/octet-stream' -InFile $path -TimeoutSec 600
    }
    if($asset.size -ne (Get-Item -LiteralPath $path).Length) { throw "Size mismatch: $name" }
    $asset|Select-Object name,size,state,browser_download_url,digest
  }
  if($release.draft) {
    $release=Invoke-RestMethod "$api/releases/$($release.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body '{"draft":false}'
  }
  $release|Select-Object html_url,draft,prerelease
}
if($Action -eq 'Pages') {
  $pages=Get-Optional "$api/pages"
  if(-not $pages) {
    $pages=Invoke-RestMethod "$api/pages" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"build_type":"legacy","source":{"branch":"main","path":"/"}}'
  }
  $pages|Select-Object html_url,status,https_enforced
}
if($Action -eq 'Status') {
  $pages=Get-Optional "$api/pages"
  $pages|Select-Object html_url,status,https_enforced
  $build=Get-Optional "$api/pages/builds/latest"
  $build|Select-Object status,commit,error
  $release=Get-Optional "$api/releases/tags/$tag"
  $release.assets|Select-Object name,size,digest,browser_download_url
}
