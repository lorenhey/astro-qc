import pytest
from astro_qc.core.pipeline import analyze_file
from astro_qc.core.models import QCGrade
from pathlib import Path
import os
import subprocess

@pytest.fixture(scope="session")
def synth_fits():
    # Run generator
    script = Path(__file__).parent.parent / "synth" / "generator.py"
    test_fits = "test_image.fits"
    if os.path.exists(test_fits):
        os.remove(test_fits)
        
    import sys
    subprocess.run([sys.executable, str(script)], check=True)
    yield test_fits
    
    if os.path.exists(test_fits):
        os.remove(test_fits)

def test_pipeline_quick(synth_fits):
    result = analyze_file(synth_fits)
    assert result.product_id == "test_image"
    assert result.file_qc.integrity_pass is True
    
    # Check metrics
    assert "image.background.median" in result.metrics
    assert "image.psf.fwhm_median" in result.metrics
    assert "image.astrometry.has_wcs" in result.metrics
    
    # Check WCS is present
    assert result.metrics["image.astrometry.has_wcs"].value is True
    
    # Overall grade should be PASS based on default rules
    assert result.overall_grade == QCGrade.PASS
