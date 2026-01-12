import http.server
import socketserver
import mimetypes

PORT = 8008

# Ensure mp4 is treated as video
mimetypes.add_type('video/mp4', '.mp4')

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".mp4": "video/mp4",
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
