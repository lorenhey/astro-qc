import sqlite3
import json
from pathlib import Path
from astro_qc.core.models import QCResult

DB_PATH = Path(".astro_qc_trend.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qc_results (
            product_id TEXT PRIMARY KEY,
            file_hash TEXT,
            overall_grade TEXT,
            profile_name TEXT,
            generated_at TEXT,
            metrics_json TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_result(result: QCResult):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Store just the simplified metrics mapping
    metrics_simplified = {
        k: v.value for k, v in result.metrics.items()
    }
    
    cursor.execute("""
        INSERT OR REPLACE INTO qc_results
        (product_id, file_hash, overall_grade, profile_name, generated_at, metrics_json)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        result.product_id,
        result.file_qc.file_hash,
        result.overall_grade.value,
        result.profile_name,
        result.generated_at.isoformat(),
        json.dumps(metrics_simplified)
    ))
    conn.commit()
    conn.close()

def get_trend_data():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT product_id, generated_at, metrics_json FROM qc_results ORDER BY generated_at ASC")
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        d = {"product_id": row[0], "generated_at": row[1]}
        d.update(json.loads(row[2]))
        data.append(d)
        
    import pandas as pd
    return pd.DataFrame(data)
