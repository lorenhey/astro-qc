# astro-qc (v2.0.0)

[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub%20Pages-Live%20v2.0.0-emerald)](https://lorenhey.github.io/astro-qc/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Standards: FITS / WCS / Moffat](https://img.shields.io/badge/Standards-FITS%20%7C%20WCS%20%7C%20Moffat-amber.svg)](https://lorenhey.github.io/astro-qc/)

> **Control de Calidad Científica de Datos Astronómicos, Métricas PSF, Selector & Ponderador de Subframes.**  
> Transforma imágenes FITS en métricas rigurosas (FWHM, elipticidad, SNR, fondo por $\sigma$-clipping) con proveniencia reproducible para decidir objetivamente si cumplen requisitos científicos de observación.

🔗 **Workbench Web Interactiva:** [https://lorenhey.github.io/astro-qc/](https://lorenhey.github.io/astro-qc/)

---

## 🔭 Capacidades Principales (v2.0.0)

1. **Modelado y Ajuste de PSF (Point Spread Function):**
   * Ajuste de perfil Gaussiano 2D y Moffat ($\beta \approx 4.765$) con resolución exacta de FWHM:
     $$\text{FWHM} = 2.35482 \cdot \sigma \quad (\text{Gauss}) \qquad \text{FWHM} = 2 \alpha \sqrt{2^{1/\beta} - 1} \quad (\text{Moffat})$$
   * Detección de elongación estelar por deriva de guiado o flexión mecánica:
     $$e = 1 - \frac{b}{a}, \quad \varepsilon = \sqrt{1 - \left(\frac{b}{a}\right)^2}$$

2. **Fondo de Cielo Robusto & SNR:**
   * Estimador insensible a rayos cósmicos y estrellas saturadas mediante Mediana y Desviación Absoluta respecto a la Mediana (**MAD**):
     $$\sigma_{\text{robust}} = 1.4826 \cdot \text{Mediana}(|x_i - \tilde{x}|)$$
   * Relación Señal/Ruido (SNR) considerando varianza Poisson, ruido de lectura del sensor y fondo de cielo.

3. **Perfiles Científicos (Science Profiles):**
   * **Astrofotografía de Espacio Profundo (DSO):** Prioriza contraste, FWHM fino y bajo fondo.
   * **Fotometría de Precisión:** Tolerancia nula a saturación para tránsitos de exoplanetas y estrellas variables.
   * **Astrometría & Seguimiento:** Exigencia crítica de simetría estelar para asteroides y NEOs.
   * **Lucky Imaging:** Selección implacable de los mejores subframes (top 10%–20%).

4. **Ponderación de Apilado (Stacking Weights):**
   * Ponderación diferencial para integración en lugar de promediado plano:
     $$W_i = 0.45 \cdot \left(\frac{\text{FWHM}_{\text{min}}}{\text{FWHM}_i}\right)^2 + 0.35 \cdot \left(\frac{1 - e_i}{1 - e_{\text{min}}}\right) + 0.20 \cdot \left(\frac{\text{SNR}_i}{\text{SNR}_{\text{max}}}\right)$$

5. **Simulador Sintético FITS & Visor Radial:**
   * Generador 2D interactivo con estrellas sintéticas, seeing ajustable en tiempo real y perfil radial 1D.
   * Modo Nocturno Rojo (`Shift+R`) para trabajo de campo en el telescopio.

---

## 🧪 Pruebas Unitarias y Verificación

```bash
# Tests de la suite JavaScript / Web
node tests/test_qc_engine.js

# Tests del motor Python
pytest
```

---

## 📄 Licencia

Código abierto bajo licencia [MIT](LICENSE). Desarrollado por **Lorenzo Perez** ([@lorenhey](https://github.com/lorenhey)).
