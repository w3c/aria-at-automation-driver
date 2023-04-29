from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys

class ConfigServer(HTTPServer):
    def __init__(self, on_get, on_post, *args, **kwargs):
        super(ConfigServer, self).__init__(*args, **kwargs)
        self.on_get = on_get
        self.on_post = on_post

class ConfigHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            body = bytes(json.dumps(self.server.on_get()), 'utf-8')
        except:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(bytes('Error: "{}"'.format(sys.exc_info()[1]), 'utf-8'))
            return

        self.send_response(200)
        self.send_header('Content-type', 'text/json')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = json.loads(self.rfile.read(content_length))
            self.server.on_post(body)
        except:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(bytes('Error: "{}"'.format(sys.exc_info()[1]), 'utf-8'))
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write('ok')
