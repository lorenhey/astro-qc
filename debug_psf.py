import numpy as np
from astropy.io import fits
from photutils.detection import DAOStarFinder
from photutils.segmentation import SourceCatalog, detect_sources
from astropy.stats import sigma_clipped_stats

with fits.open("test_image.fits") as hdul:
    data = hdul[0].data

mean, median, std = sigma_clipped_stats(data, sigma=3.0, maxiters=5)
threshold = 5.0 * std

segment_map = detect_sources(data, threshold + median, npixels=5)
print(segment_map is not None)
cat = SourceCatalog(data, segment_map, background=median)
fwhms = [obj.fwhm.value for obj in cat if obj.fwhm is not None and not np.isnan(obj.fwhm.value)]
print(f"FWHMs: {fwhms}")
