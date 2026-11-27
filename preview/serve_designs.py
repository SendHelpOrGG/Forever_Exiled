#!/usr/bin/env python3
"""Serve the design gallery directly, so it opens on its own URL.

    python3 preview/serve_designs.py          # http://localhost:8081 → the gallery
    python3 preview/serve_designs.py 9000     # custom port

The studio page lives at /designs/ inside the preview folder; this serves the same folder
but sends the root there, so the preview panel lands on the ten directions instead of the
app. Same static handler as serve.py — no dependencies.
"""

from __future__ import annotations

import functools
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LANDING = "/designs/"


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static handler that starts at the gallery and never serves a stale page."""

    def do_GET(self) -> None:  # noqa: N802 - the name is stdlib's
        if self.path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", LANDING)
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    handler = functools.partial(Handler, directory=str(ROOT))

    with Server(("0.0.0.0", port), handler) as httpd:
        print(f"Forever Exiled design gallery → http://localhost:{port}{LANDING}")
        print(f"serving {ROOT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
