"""Run after invoice_layout_regression.ts; requires pdfplumber in the QA runtime."""
import json
import sys
import pdfplumber

paths = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/private/tmp/ulg-invoice-layout-regression.json'))
for path in paths:
    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, 1):
            left, right = 15 * 72 / 25.4, page.width - 15 * 72 / 25.4
            overflow = [char for char in page.chars if char['text'].strip() and (char['x0'] < left - 1 or char['x1'] > right + 1)]
            assert not overflow, f'{path}: page {index} has {len(overflow)} characters outside margins'
print(f'Passed text-boundary checks for all pages in {len(paths)} invoice layout fixtures.')
