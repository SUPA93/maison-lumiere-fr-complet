#!/usr/bin/env python3
"""Serveur local pour Maison Lumière — avec support des requêtes HTTP Range.

Le module standard `python -m http.server` ne gère pas les Range requests,
ce qui empêche la vidéo d'être « seekable » (le scrubbing au scroll ne
fonctionnerait pas). Ce petit serveur les gère.

Usage :  python3 serve.py   puis ouvrir  http://localhost:8000
"""
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()

        range_header = self.headers.get("Range")
        if not range_header:
            return super().send_head()

        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None

        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._range_span = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        span = getattr(self, "_range_span", None)
        if span is None:
            return super().copyfile(source, outputfile)
        remaining = span
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._range_span = None


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Maison Lumière → http://localhost:{PORT}  (Ctrl+C pour arrêter)")
    ThreadingHTTPServer(("", PORT), RangeHandler).serve_forever()
