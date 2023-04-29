from threading import Thread

import addonHandler
import config
import globalPluginHandler

from .host_location import HOST_NAME, HOST_PORT
from .config_server import ConfigServer, ConfigHandler

try:
    ADDON_NAME = addonHandler.getCodeAddon().name
except addonHandler.AddonError:
    ADDON_NAME = 'scratch-nvda-config-server'

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
