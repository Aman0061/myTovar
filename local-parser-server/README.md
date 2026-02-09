# Local PDF/Excel Parse Server

This server converts PDF pages to high-quality images using `pdf2image` and
parses Excel/CSV files using `pandas`.

## Prerequisites

- Python 3.9+
- Poppler (required by `pdf2image`)

On macOS:
```
brew install poppler
```

## Install

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```
python app.py
```

Server runs on `http://localhost:5055`.

## Endpoints

`POST /pdf-to-images`

Form-data:
- `file`: PDF file

Response:
```
{ "images": ["data:image/jpeg;base64,...", "..."] }
```

`POST /excel-to-rows`

Form-data:
- `file`: Excel/CSV file

Response:
```
{ "rows": [{ "Наименование товара": "...", "Цена": 100, ... }, ...] }
```
