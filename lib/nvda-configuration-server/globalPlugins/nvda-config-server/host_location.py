import json
import os

HOST_NAME = 'localhost'

try:
    HOST_PORT = int(os.environ['NVDA_CONFIGURATION_SERVER_PORT'])
except KeyError:
    # The installation procedure inserts this file from the project's "shared"
    # directory.
    filename = os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        '..',
        '..',
        'shared',
        'default-at-configuration-port.json'
    )

    with open(filename, 'r') as handle:
        HOST_PORT = json.loads(handle.read())
