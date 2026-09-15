from pathlib import Path
from typing import Dict, Any

from astro_qc.core.models import QCResult, FileQC, QCGrade
from astro_qc.fits.reader import compute_file_hash, check_fits_integrity
from astropy.io import fits

def analyze_file(filepath: str, profile: str = "default") -> QCResult:
    path = Path(filepath)
    file_hash = compute_file_hash(str(path))
    
    integrity_pass, headers_pass, corrupt_hdus, metadata = check_fits_integrity(str(path))
    
    file_qc = FileQC(
        file_path=str(path),
        file_hash=file_hash,
        integrity_pass=integrity_pass,
        headers_pass=headers_pass,
        corrupt_hdus=corrupt_hdus,
        metadata=metadata
    )
    
    qc = QCResult(
        product_id=path.stem,
        file_qc=file_qc,
        profile_name=profile
    )
    
    if not integrity_pass:
        qc.overall_grade = QCGrade.FAIL
        return qc
        
    try:
        with fits.open(str(path)) as hdul:
            # For v1, just analyze primary or first image HDU
            data_hdu_idx = 0
            for i, hdu in enumerate(hdul):
                if hasattr(hdu, 'data') and hdu.data is not None and hdu.data.ndim == 2:
                    data_hdu_idx = i
                    break
            
            data = hdul[data_hdu_idx].data
            
            # Extract Background Metrics
            from astro_qc.metrics.background import measure_background
            bg_metrics = measure_background(data, str(path), hdu=data_hdu_idx)
            for m in bg_metrics:
                qc.metrics[m.metric_id] = m
                
            # Extract PSF Metrics
            from astro_qc.metrics.psf import measure_psf
            psf_metrics = measure_psf(data, str(path), hdu=data_hdu_idx)
            for m in psf_metrics:
                qc.metrics[m.metric_id] = m
                
            # Extract Artifact Metrics
            from astro_qc.metrics.artifacts import measure_artifacts
            artifact_metrics = measure_artifacts(data, str(path), hdu=data_hdu_idx)
            for m in artifact_metrics:
                qc.metrics[m.metric_id] = m
                
            # Extract Astrometry Metrics
            from astro_qc.metrics.astrometry import measure_astrometry
            astro_metrics = measure_astrometry(hdul[data_hdu_idx].header, str(path), hdu=data_hdu_idx)
            for m in astro_metrics:
                qc.metrics[m.metric_id] = m
    except Exception as e:
        # TODO: Log error properly
        pass

    from astro_qc.rules.engine import evaluate_qc, get_default_profile
    # TODO: Make profile loading dynamic
    profile_obj = get_default_profile()
    qc = evaluate_qc(qc, profile_obj)
    
    # Save to trending DB
    from astro_qc.trending.db import save_result
    save_result(qc)
    
    return qc
