import numpy as np
from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder
from photutils.segmentation import SourceCatalog, detect_sources
from astro_qc.core.models import MetricResult, MetricDefinition, Provenance

def measure_psf(data: np.ndarray, source_file: str, hdu: int = 0) -> list[MetricResult]:
    mean, median, std = sigma_clipped_stats(data, sigma=3.0, maxiters=5)
    threshold = 5.0 * std
    
    # Simple source detection
    daofind = DAOStarFinder(fwhm=3.0, threshold=threshold)
    sources = daofind(data - median)
    
    prov = Provenance(source_file=source_file, hdu=hdu)
    metrics = []
    
    if sources is None or len(sources) < 3:
        metrics.append(MetricResult(
            metric_id="image.psf.fwhm_median",
            value=None,
            definition=MetricDefinition(
                id="image.psf.fwhm_median",
                description="Median FWHM of detected sources",
                unit="pixels",
                algorithm="daostarfinder",
                version="1.0"
            ),
            provenance=prov,
            context={"n_stars_used": 0}
        ))
        return metrics

    # photutils SourceCatalog for shape
    segment_map = detect_sources(data, threshold + median, n_pixels=5)
    if segment_map is not None:
        import numpy as np
        bg_array = np.full_like(data, median)
        cat = SourceCatalog(data, segment_map, background=bg_array)
        fwhms = [obj.fwhm.value for obj in cat if obj.fwhm is not None and not np.isnan(obj.fwhm.value)]
        ellipticities = [obj.ellipticity.value for obj in cat if obj.ellipticity is not None and not np.isnan(obj.ellipticity.value)]
        
        n_stars = len(fwhms)
        fwhm_med = float(np.median(fwhms)) if n_stars > 0 else None
        ellipticity_med = float(np.median(ellipticities)) if n_stars > 0 else None
    else:
        fwhm_med = None
        ellipticity_med = None
        n_stars = 0

    metrics.append(MetricResult(
        metric_id="image.psf.fwhm_median",
        value=fwhm_med,
        definition=MetricDefinition(
            id="image.psf.fwhm_median",
            description="Median FWHM of detected sources",
            unit="pixels",
            algorithm="image_moments",
            version="1.0"
        ),
        provenance=prov,
        context={"n_stars_used": n_stars}
    ))
    
    metrics.append(MetricResult(
        metric_id="image.psf.ellipticity_median",
        value=ellipticity_med,
        definition=MetricDefinition(
            id="image.psf.ellipticity_median",
            description="Median ellipticity (1 - b/a) of sources",
            unit="dimensionless",
            algorithm="image_moments",
            version="1.0"
        ),
        provenance=prov,
        context={"n_stars_used": n_stars}
    ))

    return metrics
