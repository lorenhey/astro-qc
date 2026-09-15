import numpy as np
from astro_qc.core.models import MetricResult, MetricDefinition, Provenance

def measure_artifacts(data: np.ndarray, source_file: str, hdu: int = 0, saturation_level: float = 60000.0) -> list[MetricResult]:
    prov = Provenance(source_file=source_file, hdu=hdu)
    metrics = []
    
    # Saturation
    n_saturated = int(np.sum(data >= saturation_level))
    total_pixels = data.size
    fraction_saturated = n_saturated / total_pixels if total_pixels > 0 else 0.0
    
    metrics.append(MetricResult(
        metric_id="image.artifacts.saturation_fraction",
        value=fraction_saturated,
        definition=MetricDefinition(
            id="image.artifacts.saturation_fraction",
            description="Fraction of pixels above saturation level",
            unit="dimensionless",
            algorithm="threshold_count",
            version="1.0",
            parameters={"saturation_level": saturation_level}
        ),
        provenance=prov
    ))
    
    # Nans/Infs
    n_nans = int(np.sum(~np.isfinite(data)))
    metrics.append(MetricResult(
        metric_id="image.artifacts.bad_pixel_fraction",
        value=n_nans / total_pixels if total_pixels > 0 else 0.0,
        definition=MetricDefinition(
            id="image.artifacts.bad_pixel_fraction",
            description="Fraction of non-finite pixels (NaN/Inf)",
            unit="dimensionless",
            algorithm="isfinite",
            version="1.0"
        ),
        provenance=prov
    ))

    # TODO: Add trail detection using Hough transform or similar
    # TODO: Add cosmic ray candidate count using Laplacian edge detection
    
    return metrics
