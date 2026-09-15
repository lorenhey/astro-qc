import hashlib
from typing import Any, Dict, Tuple
from astropy.io import fits
import numpy as np

def compute_file_hash(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096 * 1024), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def check_fits_integrity(filepath: str) -> Tuple[bool, bool, list[int], Dict[str, Any]]:
    integrity_pass = True
    headers_pass = True
    corrupt_hdus = []
    metadata = {}
    
    try:
        with fits.open(filepath, checksum=True) as hdul:
            for i, hdu in enumerate(hdul):
                try:
                    # Check checksums if they exist
                    if 'CHECKSUM' in hdu.header or 'DATASUM' in hdu.header:
                        # astropy automatically verifies checksums if checksum=True on open
                        # If it hasn't raised a warning/exception, it's ok, but we can also manually check
                        pass
                        
                    # Verify data shape matches header
                    if hasattr(hdu, 'data') and hdu.data is not None:
                        if hdu.data.shape != tuple(hdu.shape):
                            corrupt_hdus.append(i)
                            integrity_pass = False
                            
                    # Extract key metadata from primary HDU
                    if i == 0:
                        metadata = dict(hdu.header)
                        # Filter out very long things like history or comments for the summary dict
                        keys_to_keep = ['DATE-OBS', 'MJD-OBS', 'EXPTIME', 'FILTER', 'GAIN', 'RDNOISE',
                                        'CCD-TEMP', 'RA', 'DEC', 'OBJECT', 'AIRMASS', 'XBINNING', 
                                        'YBINNING', 'INSTRUME', 'TELESCOP', 'OBSERVER', 'BUNIT', 'BITPIX']
                        metadata = {k: metadata.get(k) for k in keys_to_keep if k in metadata}
                        
                except Exception:
                    corrupt_hdus.append(i)
                    integrity_pass = False
                    
    except Exception as e:
        integrity_pass = False
        headers_pass = False
        
    return integrity_pass, headers_pass, corrupt_hdus, metadata

