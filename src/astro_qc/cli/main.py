import typer
from rich.console import Console
from rich.table import Table
import json
import pandas as pd

from astro_qc.core.pipeline import analyze_file

app = typer.Typer(help="astro-qc: Quality Control for Astronomical Data")
console = Console()

@app.command()
def quick(filepath: str):
    """Run quick QC on a FITS file"""
    with console.status(f"Analyzing {filepath}..."):
        result = analyze_file(filepath)
    
    console.print(f"\n[bold blue]PRODUCT[/bold blue]\n{result.product_id}\n")
    
    # File QC
    file_status = "[green]PASS[/green]" if result.file_qc.integrity_pass else "[red]FAIL[/red]"
    console.print(f"FITS Integrity    {file_status}")
    
    # Print metrics nicely
    table = Table(title="Metrics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="magenta")
    table.add_column("Unit", style="green")
    
    for metric_id, metric in result.metrics.items():
        val_str = f"{metric.value:.4f}" if isinstance(metric.value, float) else str(metric.value)
        table.add_row(metric_id, val_str, metric.definition.unit)
        
    console.print(table)
    
    # Print rule results
    console.print("\n[bold blue]Rule Evaluations[/bold blue]")
    for rule_res in result.rule_results:
        color = "green" if rule_res.status == "PASS" else ("yellow" if rule_res.status == "WARNING" else "red")
        console.print(f"[{color}]{rule_res.status}[/{color}] - {rule_res.rule.description}")
        
    console.print(f"\nOverall Grade: [bold]{result.overall_grade}[/bold]")

@app.command()
def json_export(filepath: str):
    """Output QC result as JSON"""
    result = analyze_file(filepath)
    print(result.model_dump_json(indent=2))

@app.command()
def trend():
    """Show simple text-based trending of metrics"""
    from astro_qc.trending.db import get_trend_data
    df = get_trend_data()
    if df.empty:
        console.print("No trend data available.")
        return
        
    console.print(f"Loaded {len(df)} records.")
    table = Table(title="Recent FWHM Trend")
    table.add_column("Product", style="cyan")
    table.add_column("Date", style="magenta")
    table.add_column("FWHM (px)", style="green")
    
    for _, row in df.tail(10).iterrows():
        val = row.get("image.psf.fwhm_median")
        val_str = f"{val:.2f}" if val is not None and not pd.isna(val) else "N/A"
        table.add_row(row["product_id"], row["generated_at"], val_str)
        
    console.print(table)

@app.command()
def ui():
    """Launch the interactive web UI"""
    import subprocess
    import sys
    from pathlib import Path
    
    ui_script = Path(__file__).parent.parent / "ui" / "app.py"
    console.print(f"Launching UI: {ui_script}")
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(ui_script)])

if __name__ == "__main__":
    app()
