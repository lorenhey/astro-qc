from astropy.wcs import WCS
from astropy.io import fits
from astro_qc.core.models import MetricResult, MetricDefinition, Provenance

def measure_astrometry(header: fits.Header, source_file: str, hdu: int = 0) -> list[MetricResult]:
    prov = Provenance(source_file=source_file, hdu=hdu)
    metrics = []
    
    try:
        # Check if WCS exists and is valid
        wcs = WCS(header)
        has_wcs = wcs.has_celestial
        
        metrics.append(MetricResult(
            metric_id="image.astrometry.has_wcs",
            value=bool(has_wcs),
            definition=MetricDefinition(
                id="image.astrometry.has_wcs",
                description="Whether a valid celestial WCS is present",
                unit="boolean",
                algorithm="astropy.wcs",
                version="1.0"
            ),
            provenance=prov
        ))
        
        if has_wcs:
            # Roundtrip sanity check for the center pixel
            nx = header.get('NAXIS1', 1000)
            ny = header.get('NAXIS2', 1000)
            
            ra, dec = wcs.pixel_to_world_values(nx/2, ny/2)
            px, py = wcs.world_to_pixel_values(ra, dec)
            
            error_x = abs(px - nx/2)
            error_y = abs(py - ny/2)
            roundtrip_error = max(error_x, error_y)
            
            metrics.append(MetricResult(
                metric_id="image.astrometry.wcs_roundtrip_error",
                value=float(roundtrip_error),
                definition=MetricDefinition(
                    id="image.astrometry.wcs_roundtrip_error",
                    description="Maximum pixel error in a forward-backward WCS transformation at the center",
                    unit="pixels",
                    algorithm="astropy.wcs.roundtrip",
                    version="1.0"
                ),
                provenance=prov
            ))
            
    except Exception as e:
        metrics.append(MetricResult(
            metric_id="image.astrometry.has_wcs",
            value=False,
            definition=MetricDefinition(
                id="image.astrometry.has_wcs",
                description="Whether a valid celestial WCS is present",
                unit="boolean",
                algorithm="astropy.wcs",
                version="1.0"
            ),
            provenance=prov,
            context={"error": str(e)}
        ))
        
    return metrics
