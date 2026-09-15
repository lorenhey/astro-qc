import numpy as np
from astropy.stats import sigma_clipped_stats
from astro_qc.core.models import MetricResult, MetricDefinition, Provenance

def measure_background(data: np.ndarray, source_file: str, hdu: int = 0) -> list[MetricResult]:
    # Use sigma clipping to estimate background robustly
    mean, median, std = sigma_clipped_stats(data, sigma=3.0, maxiters=5)
    
    prov = Provenance(source_file=source_file, hdu=hdu)
    
    metrics = []
    metrics.append(MetricResult(
        metric_id="image.background.median",
        value=float(median),
        definition=MetricDefinition(
            id="image.background.median",
            description="Median background level using sigma clipping",
            unit="ADU",
            algorithm="sigma_clipped_stats",
            version="1.0"
        ),
        provenance=prov
    ))
    
    metrics.append(MetricResult(
        metric_id="image.background.std",
        value=float(std),
        definition=MetricDefinition(
            id="image.background.std",
            description="Standard deviation of the background",
            unit="ADU",
            algorithm="sigma_clipped_stats",
            version="1.0"
        ),
        provenance=prov
    ))
    
    return metrics
