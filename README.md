# astro-qc

> `astro-qc` convierte productos astronómicos en métricas, flags y evidencia reproducibles para decidir si cumplen requisitos científicos explícitos.

## Quick Start

```bash
uv run astro-qc quick exposure.fits
```

Output:

```text
SCIENCE-0042

FITS          PASS
Metadata      PASS
Background    PASS
PSF           WARNING
Astrometry    PASS
Artifacts     WARNING

Overall:
CONDITIONAL

2 issues require review.
```

## QC Philosophy

La calidad de un dato astronómico no es un número universal. Una imagen puede ser excelente para fotometría, mediocre para morfología, e inútil para astrometría fina.
Por eso `astro-qc` mide primero y juzga después, usando **Science Profiles** configurables. 

No vas a encontrar un "Quality Score" mágico. Vas a encontrar métricas rigurosas (FWHM, ellipticity, astrometric RMS, zeropoint), con proveniencia clara de cómo y cuándo se midieron.

## Core Capabilities

- **FITS Validation:** Integridad de HDUs, checksums y validación de NAXIS/BITPIX.
- **Metadata:** Normalización de metadatos (DATE-OBS, EXPTIME, FILTER, GAIN, RA, DEC).
- **PSF & Background:** FWHM mediano, elipticidad, medición robusta del fondo usando sigma clipping y estimadores de momentos.
- **Artifacts:** Saturación (fracción de píxeles), inf/nan rates, y máscaras.
- **Detector & Calibration QC:** Capacidad para medir uniformidad, read noise y hot pixels.
- **Astrometry:** Validación estructural WCS y estimación de residuales roundtrip.
- **Rule Engine:** Evalúa métricas generadas contra reglas declarativas y perfiles científicos.
- **Trending:** Seguimiento temporal del comportamiento del instrumento, con motor DB local.
- **CLI & UI:** Herramienta de consola y explorador de tendencias en Streamlit.
- **QC Diff:** Comparaciones entre productos crudos y procesados.

## Installation

```bash
git clone https://github.com/boxmark/astro-qc
cd astro-qc
uv sync
```

## Usage

### Quick QC
Para un análisis rápido sin dependencias externas:
```bash
uv run astro-qc quick <file.fits>
```

### JSON Export
Para integración con pipelines:
```bash
uv run astro-qc json-export <file.fits>
```

### Trending
Explorar la evolución del instrumento (requiere haber analizado previamente datos):
```bash
uv run astro-qc trend
```

### UI
Lanzar la interfaz web local:
```bash
uv run astro-qc ui
```

## Synthetics and Verification
`astro-qc` incluye `synth/generator.py` para generar datos con *ground truth* y facilitar los test suites, previniendo falsos positivos.

```bash
uv run python synth/generator.py
uv run pytest
```

## Contributing
Este proyecto fue diseñado con arquitectura escalable: los módulos (PSF, Astrometria, etc.) son plug-and-play en `pipeline.py`.
Si deseas agregar fotometría compleja (como `astro-qc deep`), abre un Issue con la formulación científica y las reglas asociadas.
