#!/bin/bash
# Serve analyst application PDFs on localhost:9111
# Run this on the VPS before starting OpenClaw applications
#
# Usage: bash serve-pdfs.sh
# Then PDFs are available at http://localhost:9111/{company}/resume.pdf

cd "$(dirname "$0")"
echo "Serving PDFs from: $(pwd)"
echo "URLs available:"
for dir in */; do
  [ -f "${dir}resume.pdf" ] && echo "  http://localhost:9111/${dir}resume.pdf"
  [ -f "${dir}cover-letter.pdf" ] && echo "  http://localhost:9111/${dir}cover-letter.pdf"
done
echo ""
echo "Press Ctrl+C to stop"
python3 -m http.server 9111
