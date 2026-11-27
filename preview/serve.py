#!/usr/bin/env python3
"""Serve the UI preview over HTTP.

    python3 preview/serve.py           # http://localhost:8080
    python3 preview/serve.py 9000      # custom port

No dependencies; binds 0.0.0.0 so it also works behind a port-forward or
container preview. The page itself is plain HTML/CSS/JS and only reads
data/demo-snapshot.json from this folder.
"""

from __future__ import annotations

import functools
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static handler that never lets the browser serve a stale page."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # quieter output
        sys.stderr.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = functools.partial(Handler, directory=str(ROOT))

    with Server(("0.0.0.0", port), handler) as httpd:
        print(f"Forever Exiled UI preview → http://localhost:{port}")
        print(f"serving {ROOT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
