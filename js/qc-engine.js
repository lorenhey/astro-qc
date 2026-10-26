/**
 * qc-engine.js - Motor de Control de Calidad Científica de Datos Astronómicos (astro-qc)
 * Modela perfiles PSF (Gaussiano y Moffat), fondo por sigma-clipping, elipticidad, SNR y reglas de decisión.
 */

class PsfEngine {
  /**
   * Conversión de sigma a FWHM para perfil Gaussiano
   * FWHM = 2 * sqrt(2 * ln(2)) * sigma ≈ 2.354820045 * sigma
   */
  static sigmaToFwhm(sigma) {
    return Number(sigma) * 2.354820045;
  }

  static fwhmToSigma(fwhm) {
    return Number(fwhm) / 2.354820045;
  }

  /**
   * FWHM para perfil Moffat: FWHM = 2 * alpha * sqrt(2^(1/beta) - 1)
   * Beta típico atmosférico = 4.765 (Trujillo et al.)
   */
  static moffatFwhm(alpha, beta = 4.765) {
    const factor = Math.sqrt(Math.pow(2, 1 / beta) - 1);
    return 2 * Number(alpha) * factor;
  }

  /**
   * Cálculo de elipticidad y excentricidad
   * a: semi-eje mayor, b: semi-eje menor (a >= b)
   * Ellipticity e = 1 - b/a
   * Eccentricity eps = sqrt(1 - (b/a)^2)
   */
  static calculateEllipticity(fwhmMajor, fwhmMinor) {
    const a = Math.max(Number(fwhmMajor), Number(fwhmMinor));
    const b = Math.min(Number(fwhmMajor), Number(fwhmMinor));
    if (a <= 0) return { ellipticity: 0, eccentricity: 0, axisRatio: 1.0 };
    
    const ratio = b / a;
    const ellipticity = 1.0 - ratio;
    const eccentricity = Math.sqrt(Math.max(0, 1.0 - Math.pow(ratio, 2)));

    return {
      major: a,
      minor: b,
      axisRatio: Math.round(ratio * 1000) / 1000,
      ellipticity: Math.round(ellipticity * 1000) / 1000,
      eccentricity: Math.round(eccentricity * 1000) / 1000
    };
  }

  /**
   * Perfil radial Gaussiano 1D: I(r) = B + I_0 * exp( - r² / (2 * sigma²) )
   */
  static gaussianRadialProfile(r, i0, sigma, bg = 0) {
    return bg + i0 * Math.exp(-Math.pow(r, 2) / (2 * Math.pow(sigma, 2)));
  }

  /**
   * Perfil radial Moffat 1D: I(r) = B + I_0 * [ 1 + (r / alpha)² ]^(-beta)
   */
  static moffatRadialProfile(r, i0, alpha, beta = 4.765, bg = 0) {
    return bg + i0 * Math.pow(1 + Math.pow(r / alpha, 2), -beta);
  }
}

class BackgroundEngine {
  /**
   * Estimador robusto de fondo y ruido mediante Mediana y MAD (Median Absolute Deviation)
   * sigma_mad = 1.4826 * MAD
   */
  static computeStats(values) {
    if (!values || values.length === 0) return { median: 0, std: 0, mad: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    const diffs = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = n % 2 === 0 ? (diffs[n / 2 - 1] + diffs[n / 2]) / 2 : diffs[Math.floor(n / 2)];
    const sigmaRobust = 1.4826 * mad;

    return {
      median: Math.round(median * 100) / 100,
      mad: Math.round(mad * 100) / 100,
      std: Math.round(sigmaRobust * 100) / 100
    };
  }

  /**
   * Cálculo de Relación Señal/Ruido (SNR) de una fuente puntual
   * SNR = (I_peak - B) / sqrt( (I_peak - B)/Gain + sigma_bg² + sigma_read² )
   */
  static calculateSNR(fluxPeak, bgMedian, bgSigma, gainEPerAdu = 1.0, readNoiseE = 2.0) {
    const signal = Math.max(0, fluxPeak - bgMedian);
    if (signal <= 0) return 0;
    
    // Varianza de Poisson del flujo (electrones) + ruido de fondo + ruido de lectura
    const noiseVar = (signal / gainEPerAdu) + Math.pow(bgSigma, 2) + Math.pow(readNoiseE / gainEPerAdu, 2);
    const snr = signal / Math.sqrt(Math.max(1e-4, noiseVar));
    return Math.round(snr * 10) / 10;
  }
}

class ScienceProfiles {
  static PROFILES = {
    deep_sky: {
      id: "deep_sky",
      name: "Astrofotografía de Espacio Profundo (DSO)",
      description: "Balance óptimo entre FWHM moderado, baja elipticidad y máxima relación señal/ruido en cielo oscuro.",
      rules: {
        fwhmArcsecMax: 2.8,
        ellipticityMax: 0.16,
        backgroundAduMax: 1200,
        snrMin: 18.0,
        saturationFractionMax: 0.0005 // 0.05%
      }
    },
    photometry: {
      id: "photometry",
      name: "Fotometría de Precisión (Tránsitos & Variables)",
      description: "Tolerancia estricta a saturación, alta estabilidad de flujo y fondo homogéneo para fotometría milimagnitud.",
      rules: {
        fwhmArcsecMax: 3.5,
        ellipticityMax: 0.22,
        backgroundAduMax: 2000,
        snrMin: 45.0,
        saturationFractionMax: 0.00005 // 0.005%
      }
    },
    astrometry: {
      id: "astrometry",
      name: "Astrometría & Seguimiento (Asteroides & NEOs)",
      description: "Exigencia crítica de simetría estelar (elipticidad mínima) para evitar corrimientos sistemáticos de centroide.",
      rules: {
        fwhmArcsecMax: 2.4,
        ellipticityMax: 0.10,
        backgroundAduMax: 2500,
        snrMin: 12.0,
        saturationFractionMax: 0.001
      }
    },
    lucky_imaging: {
      id: "lucky_imaging",
      name: "Alta Resolución / Lucky Imaging (Planetaria)",
      description: "Selección implacable de los mejores subframes con FWHM ultra-fino para congelar la turbulencia seeing.",
      rules: {
        fwhmArcsecMax: 1.8,
        ellipticityMax: 0.12,
        backgroundAduMax: 3000,
        snrMin: 25.0,
        saturationFractionMax: 0.0002
      }
    }
  };

  /**
   * Evalúa un subframe individual contra un perfil científico
   */
  static evaluateFrame(frameMetrics, profileKey = "deep_sky") {
    const profile = this.PROFILES[profileKey] || this.PROFILES.deep_sky;
    const r = profile.rules;
    const issues = [];

    // FWHM
    let fwhmGrade = "PASS";
    if (frameMetrics.fwhmArcsec > r.fwhmArcsecMax * 1.25) {
      fwhmGrade = "REJECT";
      issues.push(`FWHM excesivo (${frameMetrics.fwhmArcsec.toFixed(2)}" > ${r.fwhmArcsecMax}")`);
    } else if (frameMetrics.fwhmArcsec > r.fwhmArcsecMax) {
      fwhmGrade = "WARNING";
      issues.push(`FWHM marginal (${frameMetrics.fwhmArcsec.toFixed(2)}" > ${r.fwhmArcsecMax}")`);
    }

    // Elipticidad
    let ellipGrade = "PASS";
    if (frameMetrics.ellipticity > r.ellipticityMax * 1.3) {
      ellipGrade = "REJECT";
      issues.push(`Estrellas elongadas / error de guiado (e=${frameMetrics.ellipticity.toFixed(3)} > ${r.ellipticityMax})`);
    } else if (frameMetrics.ellipticity > r.ellipticityMax) {
      ellipGrade = "WARNING";
      issues.push(`Elipticidad al límite (e=${frameMetrics.ellipticity.toFixed(3)})`);
    }

    // Fondo
    let bgGrade = "PASS";
    if (frameMetrics.backgroundAdu > r.backgroundAduMax * 1.4) {
      bgGrade = "REJECT";
      issues.push(`Cielo demasiado brillante o paso de nubes (${frameMetrics.backgroundAdu} ADU)`);
    } else if (frameMetrics.backgroundAdu > r.backgroundAduMax) {
      bgGrade = "WARNING";
    }

    // SNR
    let snrGrade = "PASS";
    if (frameMetrics.snr < r.snrMin * 0.7) {
      snrGrade = "REJECT";
      issues.push(`Señal/Ruido insuficiente (SNR ${frameMetrics.snr.toFixed(1)} < ${r.snrMin})`);
    } else if (frameMetrics.snr < r.snrMin) {
      snrGrade = "WARNING";
    }

    // Veredicto final
    let overallGrade = "PASS";
    if (fwhmGrade === "REJECT" || ellipGrade === "REJECT" || bgGrade === "REJECT" || snrGrade === "REJECT") {
      overallGrade = "REJECT";
    } else if (fwhmGrade === "WARNING" || ellipGrade === "WARNING" || bgGrade === "WARNING" || snrGrade === "WARNING") {
      overallGrade = "CONDITIONAL";
    }

    return {
      profile: profile.name,
      overallGrade,
      issues,
      grades: {
        fwhm: fwhmGrade,
        ellipticity: ellipGrade,
        background: bgGrade,
        snr: snrGrade
      }
    };
  }

  /**
   * Ponderación de apilado (Stacking Weight):
   * Weight = 0.45 * (FWHM_min / FWHM_i)^2 + 0.35 * ((1 - e_i) / (1 - e_min)) + 0.20 * (SNR_i / SNR_max)
   */
  static calculateStackWeight(frame, minFwhm, minEllip, maxSnr) {
    const fwhmRatio = minFwhm > 0 ? Math.pow(minFwhm / Math.max(0.1, frame.fwhmArcsec), 2) : 1;
    const ellipRatio = (1 - frame.ellipticity) / Math.max(0.1, 1 - minEllip);
    const snrRatio = maxSnr > 0 ? frame.snr / maxSnr : 1;

    const w = 0.45 * fwhmRatio + 0.35 * ellipRatio + 0.20 * snrRatio;
    return Math.round(w * 1000) / 1000;
  }
}

// Exportación compatible Node y Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PsfEngine, BackgroundEngine, ScienceProfiles };
}
