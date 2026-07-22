$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server started on http://localhost:$port"
} catch {
    Write-Error "Failed to start server: $_"
    exit 1
}

# Define root paths
$webRoot = "d:\calci watch"
$photoRoot = "$webRoot\photos"


while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        $cleanPath = $urlPath.TrimEnd('/').ToLower()
        if ($cleanPath -eq "" -or $cleanPath -eq "/" -or $cleanPath -eq "/track") {
            $urlPath = "/index.html"
        } elseif ($cleanPath -eq "/admin") {
            $urlPath = "/admin.html"
        } elseif ($cleanPath -eq "/about") {
            $urlPath = "/about.html"
        } elseif ($cleanPath -eq "/contact") {
            $urlPath = "/contact.html"
        } elseif ($cleanPath -eq "/privacy") {
            $urlPath = "/privacy.html"
        } elseif ($cleanPath -eq "/terms") {
            $urlPath = "/terms.html"
        } elseif ($cleanPath -eq "/shipping") {
            $urlPath = "/shipping.html"
        } elseif ($cleanPath -eq "/refund") {
            $urlPath = "/refund.html"
        }
        
        $filePath = ""
        $contentType = "text/plain"
        
        # Check if requesting photos or web files
        if ($urlPath.StartsWith("/photos/")) {
            $fileName = $urlPath.Substring(8) # remove "/photos/"
            # Prevent path traversal
            $fileName = [System.IO.Path]::GetFileName($fileName)
            $filePath = [System.IO.Path]::Combine($photoRoot, $fileName)
            $contentType = "image/jpeg"
        } else {
            $fileName = $urlPath.Substring(1) # remove leading "/"
            # Prevent path traversal and backslash confusion
            $fileName = $fileName -replace "\.\.", ""
            $fileName = $fileName -replace "\\", "/"
            $filePath = [System.IO.Path]::Combine($webRoot, $fileName)
            
            # Determine content type
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".css"  { $contentType = "text/css; charset=utf-8" }
                ".js"   { $contentType = "application/javascript; charset=utf-8" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".png"  { $contentType = "image/png" }
                ".ico"  { $contentType = "image/x-icon" }
                default { $contentType = "application/octet-stream" }
            }
        }
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found: $urlPath ($filePath)")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
    } catch {
        Write-Host "Error handling request: $_"
    } finally {
        if ($null -ne $response) {
            $response.Close()
        }
    }
}
