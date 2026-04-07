$functions = Get-ChildItem -Path "supabase\functions" -Directory | Select-Object -ExpandProperty Name
$results = @()

foreach ($func in $functions) {
    if ($func -eq "_shared" -or $func.StartsWith(".")) { continue }
    Write-Host "Invoking $func..."
    $output = npx supabase functions invoke $func --project-ref tipnjnfbbnbskdlodrww 2>&1
    $outputStr = $output -join " "
    $results += [PSCustomObject]@{ Function = $func; Output = $outputStr }
    Write-Host "Done: $func. Output length: $($outputStr.Length)"
}

$results | ConvertTo-Json | Out-File -FilePath "smoke_test_results.json"
Write-Host "Finished entirely."
