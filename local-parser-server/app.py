from flask import Flask, request, jsonify
from flask_cors import CORS
from pdf2image import convert_from_path
import pandas as pd
import tempfile
import os
import io
import base64
import json
import re
from pathlib import Path
from typing import Optional
import traceback

from dotenv import load_dotenv
# Загружаем .env из корня проекта (для OPENAI_API_KEY / VITE_OPENAI_API_KEY)
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(env_path)
load_dotenv()

from openai import OpenAI

app = Flask(__name__)
CORS(app)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("VITE_OPENAI_API_KEY")


@app.post("/pdf-to-images")
def pdf_to_images():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "filename is required"}), 400

    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "input.pdf")
        file.save(pdf_path)

        try:
            pages = convert_from_path(pdf_path, dpi=300)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

        images = []
        for page in pages:
            buffer = io.BytesIO()
            page.save(buffer, format="JPEG", quality=95)
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            images.append(f"data:image/jpeg;base64,{encoded}")

    return jsonify({"images": images})


@app.post("/excel-to-rows")
def excel_to_rows():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "filename is required"}), 400

    def detect_header_row(df):
        keywords = ["наименование", "товар", "номенклатура", "описание"]
        for i in range(min(len(df), 20)):
            row = df.iloc[i].astype(str).str.lower()
            if any(any(k in cell for k in keywords) for cell in row):
                return i
        return 0

    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = os.path.join(tmpdir, file.filename)
        file.save(file_path)

        try:
            if file.filename.lower().endswith(".csv"):
                raw = pd.read_csv(file_path, sep=None, engine="python", header=None)
                header_row = detect_header_row(raw)
                df = pd.read_csv(file_path, sep=None, engine="python", header=header_row)
                df = df.dropna(how="all")
                rows = df.fillna("").to_dict(orient="records")
                return jsonify({"rows": rows})

            # Excel
            engine = _excel_engine(file.filename)
            xls = pd.ExcelFile(file_path, engine=engine)
            rows = []
            for sheet_name in xls.sheet_names:
                raw = xls.parse(sheet_name, header=None)
                header_row = detect_header_row(raw)
                df = xls.parse(sheet_name, header=header_row)
                df = df.dropna(how="all")
                sheet_rows = df.fillna("").to_dict(orient="records")
                rows.extend(sheet_rows)
            return jsonify({"rows": rows})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500


def _detect_header_row(df: pd.DataFrame) -> int:
    """Находит строку с заголовками по ключевым словам."""
    keywords = ["наименование", "товар", "номенклатура", "описание", "цена", "стоимость", "прайс", "кол-во", "количество"]
    for i in range(min(len(df), 20)):
        row = df.iloc[i].astype(str).str.lower()
        for cell in row:
            if any(k in str(cell) for k in keywords):
                return i
    return 0


def _excel_engine(file_name: str) -> Optional[str]:
    lower = file_name.lower()
    if lower.endswith(".xls"):
        return "xlrd"
    if lower.endswith(".xlsx") or lower.endswith(".xlsm") or lower.endswith(".xlsb"):
        return "openpyxl"
    return None


def _parse_price(val) -> float:
    """Преобразует значение в число (float), сохраняя копейки."""
    if pd.isna(val) or val == "" or val is None:
        return 0.0
    s = str(val).strip().replace(",", ".").replace(" ", "")
    s = re.sub(r"[^\d.-]", "", s)
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _parse_quantity(val) -> float:
    """Преобразует количество в число."""
    if pd.isna(val) or val == "" or val is None:
        return 1.0
    s = str(val).strip().replace(",", ".").replace(" ", "")
    s = re.sub(r"[^\d.-]", "", s)
    try:
        return float(s) if s else 1.0
    except ValueError:
        return 1.0


def _ai_scout_columns(preview_rows: list[list]) -> dict:
    """ИИ анализирует начало файла и возвращает индексы колонок."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY не задан в окружении")
    client = OpenAI(api_key=OPENAI_API_KEY)
    text = "\n".join(["\t".join(str(c) for c in row) for row in preview_rows[:6]])
    prompt = """Проанализируй таблицу ниже. Определи индексы колонок (0-based, первая колонка = 0).
Верни ТОЛЬКО валидный JSON без пояснений:
{
  "name_idx": <индекс колонки с названием товара/наименованием>,
  "price_idx": <индекс колонки с ценой/стоимостью/прайс>,
  "unit_idx": <индекс колонки с единицей измерения: шт, кг, л, м и т.д., или -1 если нет>,
  "qty_idx": <индекс колонки с количеством/кол-во, или -1 если нет>
}
Если колонка не найдена — используй -1. Учитывай синонимы: Цена, Стоимость, Прайс, Цена за ед.; Наименование, Товар, Номенклатура; Количество, Кол-во, Кол.

Таблица:
""" + text
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    content = resp.choices[0].message.content.strip()
    content = re.sub(r"^```json\s*", "", content).replace("```", "").strip()
    # Пытаемся вытащить JSON-объект, если модель вернула лишний текст
    obj_match = re.search(r"\{[\s\S]*\}", content)
    if obj_match:
        content = obj_match.group(0)
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Не удалось разобрать JSON от ИИ: {content[:500]}") from exc


@app.post("/excel-smart-parse")
def excel_smart_parse():
    """Умное сопоставление колонок: ИИ определяет индексы, pandas разбирает весь файл."""
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "filename is required"}), 400

    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = os.path.join(tmpdir, file.filename)
        file.save(file_path)
        try:
            if file.filename.lower().endswith(".csv"):
                raw = pd.read_csv(file_path, sep=None, engine="python", header=None)
            else:
                engine = _excel_engine(file.filename)
                xls = pd.ExcelFile(file_path, engine=engine)
                dfs = []
                for sn in xls.sheet_names:
                    d = pd.read_excel(xls, sheet_name=sn, header=None, engine=engine)
                    dfs.append(d)
                max_cols = max(d.shape[1] for d in dfs)
                for d in dfs:
                    if d.shape[1] < max_cols:
                        for c in range(d.shape[1], max_cols):
                            d[c] = ""
                raw = pd.concat(dfs, ignore_index=True)

            raw = raw.dropna(how="all")
            if raw.empty:
                return jsonify({"error": "Файл пуст или не содержит таблицу"}), 400
            header_row = _detect_header_row(raw)
            preview = [raw.iloc[header_row].astype(str).tolist()]
            data_start = header_row + 1
            for i in range(data_start, min(data_start + 5, len(raw))):
                preview.append(raw.iloc[i].astype(str).tolist())

            mapping = _ai_scout_columns(preview)
            name_idx = int(mapping.get("name_idx", -1))
            price_idx = int(mapping.get("price_idx", -1))
            unit_idx = int(mapping.get("unit_idx", -1))
            qty_idx = int(mapping.get("qty_idx", -1))

            if name_idx < 0:
                return jsonify({"error": "Не найдена колонка с наименованием"}), 400

            entries = []
            today = pd.Timestamp.now().strftime("%d.%m.%Y")
            for i in range(data_start, len(raw)):
                row = raw.iloc[i]
                n_cols = len(row)
                name = str(row.iloc[name_idx]).strip() if name_idx < n_cols else ""
                if not name or name.lower() in ("nan", "none", ""):
                    continue
                price = _parse_price(row.iloc[price_idx]) if 0 <= price_idx < n_cols else 0.0
                qty = _parse_quantity(row.iloc[qty_idx]) if 0 <= qty_idx < n_cols else 1.0
                unit = str(row.iloc[unit_idx]).strip() if 0 <= unit_idx < n_cols and unit_idx >= 0 else "шт"
                if not unit or unit.lower() in ("nan", "none"):
                    unit = "шт"
                total = round(price * qty, 2)
                entries.append({
                    "id": f"{int(pd.Timestamp.now().timestamp() * 1000)}-{i}",
                    "date": today,
                    "supplier": "Импортированные данные",
                    "product": name,
                    "quantity": qty,
                    "price": price,
                    "total": total,
                    "unit": unit
                })

            return jsonify({"entries": entries})
        except Exception as exc:
            print("[excel-smart-parse] error:", exc)
            print(traceback.format_exc())
            return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5055, debug=True)
