from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from threading import Thread
import sys

import addonHandler
import config
import globalPluginHandler

try:
    ADDON_NAME = addonHandler.getCodeAddon().name
except addonHandler.AddonError:
    ADDON_NAME = 'scratch-nvda-config-server'

HOST_NAME = 'localhost'
HOST_PORT = 7658

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
            before = config.conf.dict()['virtualBuffers']['passThroughAudioIndication']
            self.server.on_post(body)
        except:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(bytes('Error: "{}"'.format(sys.exc_info()[1]), 'utf-8'))
            return

        self.send_response(200)
        self.end_headers()
        after = config.conf.dict()['virtualBuffers']['passThroughAudioIndication']
        self.wfile.write('ok {} {} '.format(before, after).encode('utf-8'))

def update_dictlike(dictlike, values):
    for key, value in values.items():
        if hasattr(dictlike[key], '__setitem__'):
            update_dictlike(dictlike[key], value)
        else:
            dictlike[key] = value

class GlobalPlugin(globalPluginHandler.GlobalPlugin):
    def __init__(self, *args, **kwargs):
        super(GlobalPlugin, self).__init__(*args, **kwargs)
        def on_get():
            return self.dict()
        def on_post(body):
            self.update(body)
        self.server = ConfigServer(on_get, on_post, (HOST_NAME, HOST_PORT), ConfigHandler)
        self.server_thread = Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()
        self.profile_to_restore = config.conf.profiles[-1].name

    def terminate(self, *args, **kwargs):
        self.server.shutdown()
        self.server.server_close()
        self.server_thread.join()
        config.conf.manualActivateProfile(self.profile_to_restore)
        super().terminate(*args, **kwargs)

    @property
    def config(self):
        profile = config.conf.profiles[-1].name
        if profile != ADDON_NAME:
            self.profile_to_restore = profile
            if ADDON_NAME not in config.conf.listProfiles():
                config.conf.createProfile(ADDON_NAME)
            config.conf.manualActivateProfile(ADDON_NAME)
        return config.conf

    def dict(self):
        return self.config.dict()

    def update(self, values):
        update_dictlike(self.config, values)
