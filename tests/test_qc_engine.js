const assert = require('assert');
const { PsfEngine, BackgroundEngine, ScienceProfiles } = require('../js/qc-engine.js');

console.log("=== INICIANDO SUITE DE PRUEBAS PARA ASTRO-QC ENGINE ===");

// TEST 1: PsfEngine Conversiones y Perfiles
console.log("Test 1: FWHM y Perfiles PSF Gaussiano / Moffat");
const fwhm = PsfEngine.sigmaToFwhm(1.5);
assert.ok(Math.abs(fwhm - 3.532) < 0.01, `FWHM para sigma=1.5 debe ser ~3.532 (obtenido ${fwhm})`);

const moffat = PsfEngine.moffatFwhm(2.0, 4.765);
assert.ok(moffat > 1.4 && moffat < 2.0, `Moffat FWHM con alpha=2.0, beta=4.765 debe ser ~1.64 (obtenido ${moffat})`);

// Perfil radial
const iPeak = PsfEngine.gaussianRadialProfile(0, 1000, 1.5, 50);
assert.strictEqual(iPeak, 1050, "Intensidad en r=0 debe ser I0 + bg = 1050");
console.log("  -> OK: Modelos PSF verificados.");

// TEST 2: Elipticidad y Excentricidad
console.log("Test 2: Elipticidad y Excentricidad Estelar");
const ellip = PsfEngine.calculateEllipticity(3.0, 2.7);
assert.strictEqual(ellip.ellipticity, 0.1, "Elipticidad para 3.0 vs 2.7 debe ser 0.10");
assert.ok(ellip.eccentricity > 0.43 && ellip.eccentricity < 0.45, `Excentricidad debe ser ~0.436 (obtenido ${ellip.eccentricity})`);
console.log("  -> OK: Métricas de elongación estelar validadas.");

// TEST 3: BackgroundEngine y MAD
console.log("Test 3: Estimador Robusto de Fondo (Mediana y MAD)");
const bgPixels = [100, 102, 98, 101, 99, 105, 95, 1000]; // con outlier cósmico 1000
const stats = BackgroundEngine.computeStats(bgPixels);
assert.ok(stats.median >= 99 && stats.median <= 102, `Mediana debe ser insensible al outlier (obtenido ${stats.median})`);
assert.ok(stats.std < 10, `Sigma MAD debe ignorar el outlier (obtenido ${stats.std})`);

const snr = BackgroundEngine.calculateSNR(2500, 100, 5, 1.0, 2.0);
assert.ok(snr > 40 && snr < 55, `SNR para señal 2400 debe ser ~48 (obtenido ${snr})`);
console.log("  -> OK: Estimadores de fondo y SNR verificados.");

// TEST 4: ScienceProfiles y Reglas de Calidad
console.log("Test 4: Reglas de Decisión y Perfiles Científicos");
const goodFrame = { fwhmArcsec: 2.1, ellipticity: 0.08, backgroundAdu: 850, snr: 32.0 };
const evalGood = ScienceProfiles.evaluateFrame(goodFrame, "deep_sky");
assert.strictEqual(evalGood.overallGrade, "PASS", "Frame de alta calidad debe tener grado PASS");

const badFwhmFrame = { fwhmArcsec: 4.2, ellipticity: 0.28, backgroundAdu: 850, snr: 14.0 };
const evalBad = ScienceProfiles.evaluateFrame(badFwhmFrame, "deep_sky");
assert.strictEqual(evalBad.overallGrade, "REJECT", "FWHM muy degradado debe ser REJECT");
assert.ok(evalBad.issues.length > 0, "Debe reportar issues");

const astrometryFrame = { fwhmArcsec: 2.2, ellipticity: 0.18, backgroundAdu: 900, snr: 25.0 };
const evalAstro = ScienceProfiles.evaluateFrame(astrometryFrame, "astrometry");
assert.strictEqual(evalAstro.overallGrade, "REJECT", "Elipticidad 0.18 debe ser rechazada en perfil astrometría");
console.log("  -> OK: Perfiles y motor de reglas validados.");

// TEST 5: Ponderación de Stacking
console.log("Test 5: Ponderación de Apilado (Stacking Weight)");
const w1 = ScienceProfiles.calculateStackWeight(goodFrame, 2.0, 0.07, 35.0);
assert.ok(w1 > 0.8 && w1 <= 1.05, `Peso de frame excelente debe ser ~0.95 (obtenido ${w1})`);
const w2 = ScienceProfiles.calculateStackWeight(badFwhmFrame, 2.0, 0.07, 35.0);
assert.ok(w2 < 0.5, `Peso de frame degradado debe ser bajo (obtenido ${w2})`);
console.log(`  -> OK: Pesos calculados correctamente: w_bueno=${w1}, w_malo=${w2}`);

console.log("\n==========================================");
console.log(" TODOS LOS TESTS DE ASTRO-QC PASARON (5/5)");
console.log("==========================================");
