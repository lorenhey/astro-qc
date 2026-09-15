import numpy as np
from astropy.io import fits
from astropy.modeling.models import Gaussian2D

def create_synthetic_starfield(
    filename: str, 
    shape: tuple = (1024, 1024), 
    n_stars: int = 100, 
    background_mean: float = 100.0,
    background_std: float = 5.0,
    fwhm: float = 4.0,
    ellipticity: float = 0.0
):
    """Generate a synthetic FITS file with a starfield."""
    
    # Background
    data = np.random.normal(loc=background_mean, scale=background_std, size=shape)
    
    # Stars
    xs = np.random.uniform(10, shape[1]-10, n_stars)
    ys = np.random.uniform(10, shape[0]-10, n_stars)
    fluxes = np.random.uniform(500, 50000, n_stars)
    
    # FWHM to sigma
    sigma = fwhm / 2.355
    sigma_x = sigma
    sigma_y = sigma * (1.0 - ellipticity)
    
    y, x = np.mgrid[:shape[0], :shape[1]]
    
    for i in range(n_stars):
        g = Gaussian2D(amplitude=fluxes[i], x_mean=xs[i], y_mean=ys[i], x_stddev=sigma_x, y_stddev=sigma_y)
        data += g(x, y)
        
    hdu = fits.PrimaryHDU(data)
    
    # Add metadata
    hdu.header['DATE-OBS'] = '2026-09-15T12:00:00'
    hdu.header['EXPTIME'] = 60.0
    hdu.header['FILTER'] = 'V'
    hdu.header['INSTRUME'] = 'SYNTH-CAM'
    
    # Add WCS
    from astropy.wcs import WCS
    w = WCS(naxis=2)
    w.wcs.crpix = [shape[1]/2, shape[0]/2]
    w.wcs.cdelt = np.array([-0.0001, 0.0001])
    w.wcs.crval = [10.0, 20.0]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    hdu.header.extend(w.to_header())
    
    hdul = fits.HDUList([hdu])
    hdul.writeto(filename, overwrite=True, checksum=True)

if __name__ == "__main__":
    create_synthetic_starfield("test_image.fits")
