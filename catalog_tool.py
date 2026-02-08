import pandas as pd
import os

def export_db_to_esf_excel(db_products: list, output_file: str = "full_catalog_export.xlsx"):
    """
    Exports product list from Database to a strict ESF-compatible Excel file.
    
    Args:
        db_products: List of dicts like [{"id": 1, "name": "..."}]
        output_file: Target filename (.xlsx)
    """
    if not db_products:
        print("Database is empty. Nothing to export.")
        return

    processed_data = []

    for item in db_products:
        name = item.get("name", "Без названия")
        upper_name = name.upper()

        # 1. Smart TNVED Logic (Expanded for DB items)
        if any(keyword in upper_name for keyword in ["ЛЕСТНИЦА", "СТРЕМЯНКА"]):
            tnved = "7616999008"
        elif any(keyword in upper_name for keyword in ["ДРЕЛЬ", "ПЕРФОРАТОР", "ШУРУПОВЕРТ"]):
            tnved = "8467211000"
        else:
            # Paints, Glue, Dry Mixes, etc.
            tnved = "3214101009"

        # 2. Build record according to "Golden Format"
        processed_data.append({
            "Наименование товара": name,
            "Код единицы измерения": "шт",
            "Код ТН ВЭД": str(tnved),
            "Признак товара": "1",
            "Цена": 0
        })

    # 3. Create DataFrame
    df = pd.DataFrame(processed_data)

    # 4. Strict Column Ordering and Data Types
    # Ensure columns match the portal's expectation exactly
    df = df[["Наименование товара", "Код единицы измерения", "Код ТН ВЭД", "Признак товара", "Цена"]]
    
    # Force string types to preserve leading zeros and prevent scientific notation
    df["Код ТН ВЭД"] = df["Код ТН ВЭД"].astype(str)
    df["Код единицы измерения"] = df["Код единицы измерения"].astype(str)
    df["Признак товара"] = df["Признак товара"].astype(str)
    
    # Price must be numeric (0)
    df["Цена"] = pd.to_numeric(df["Цена"])

    # 5. Save with openpyxl engine
    try:
        df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"Export successful: {output_file}")
        print(f"Total products exported: {len(processed_data)}")
    except Exception as e:
        print(f"Error during Excel export: {e}")

if __name__ == "__main__":
    # Mock Database
    mock_db = [
        {"id": 1, "name": "Лестница алюминиевая 5м"},
        {"id": 2, "name": "Краска белая 10л"},
        {"id": 3, "name": "Дрель ударная Bosch"},
        {"id": 4, "name": "Шуруповерт аккумуляторный"},
        {"id": 5, "name": "Стремянка стальная 3 ступени"}
    ]
    
    export_db_to_esf_excel(mock_db)
