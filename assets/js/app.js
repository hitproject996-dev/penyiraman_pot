import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQWvoDxDyVCuLEDiwammjUIVYxVARzJig",
    authDomain: "project-ta-951b4.firebaseapp.com",
    databaseURL: "https://project-ta-951b4-default-rtdb.firebaseio.com",
    projectId: "project-ta-951b4",
    storageBucket: "project-ta-951b4.firebasestorage.app",
    messagingSenderId: "217854138058",
    appId: "1:217854138058:web:50a5bcd5a61ac1820c4633",
    measurementId: "G-6ML8QQEGNZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const aktuatorRef = ref(database, 'aktuator');

// Sensor readings RTDB node (auto-detect)
// If you already know the exact RTDB path for sensor readings, set it here (example: 'monitoring' or 'monitoring/sensor').
const SENSOR_PATH_OVERRIDE = '';

const SENSOR_PATH_CANDIDATES = [
    'sensor',
    'sensors',
    'monitoring',
    'monitor',
    'data_sensor',
    'sensor_data',
    // common alternatives
    'realtime',
    'data',
    'nilai_sensor',
    'smartpot'
];

const ACTUATOR_KEYS = {
    water: 'mosvet_1',
    fertilizer: 'mosvet_2',
    mixer: 'mosvet_8'
};

// Pot states (all ON by default)
const potStates = {
    1: true,
    2: true,
    3: true,
    4: true,
    5: true
};

// Water/Fertilizer states
const actuatorStates = {
    water: true,
    fertilizer: true,
    mixer: true
};

// Normalize toggle values from RTDB (supports boolean, number, and string forms)
function normalizeToggleValue(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['1', 'true', 'on', 'aktif', 'yes', 'y'].includes(normalized)) return true;
        if (['0', 'false', 'off', 'nonaktif', 'no', 'n', ''].includes(normalized)) return false;

        const numeric = Number(normalized);
        if (!Number.isNaN(numeric)) return numeric !== 0;
    }

    return fallback;
}

// Check if all pots are OFF
function areAllPotsOff() {
    return !potStates[1] && !potStates[2] && !potStates[3] && !potStates[4] && !potStates[5];
}

// Show notification/alert to user
function showNotification(message) {
    alert(message);
}

function renderToggleUI(statusEl, indicatorEl, isOn) {
    if (!statusEl || !indicatorEl) return;

    statusEl.textContent = isOn ? 'ON' : 'OFF';
    indicatorEl.classList.toggle('active', isOn);
    indicatorEl.classList.toggle('inactive', !isOn);
}

// Toggle pot function
window.togglePot = function(potNumber) {
    potStates[potNumber] = !potStates[potNumber];
    const statusEl = document.getElementById(`status${potNumber}`);
    const indicatorEl = document.getElementById(`indicator${potNumber}`);
    renderToggleUI(statusEl, indicatorEl, potStates[potNumber]);
    
    // Update Firebase - Pot 1-5 maps to mosvet_3-7
    const mosvetNumber = potNumber + 2;
    const mosvetKey = `mosvet_${mosvetNumber}`;
    update(aktuatorRef, {
        [mosvetKey]: potStates[potNumber]
    }).then(() => {
        console.log(`POT ${potNumber} updated to ${potStates[potNumber]} (${mosvetKey})`);
    }).catch((error) => {
        console.error('Error updating Firebase:', error);
    });
};

// Toggle water actuator (mosvet_1 - Pompa air)
window.toggleWater = function() {
    const newWaterState = !actuatorStates.water;
    
    // Check if all pots are OFF and user is trying to turn water ON
    if (newWaterState && areAllPotsOff()) {
        showNotification('Semua pot dalam status OFF. Aktifkan minimal satu pot sebelum mengaktifkan pompa air.');
        return;
    }
    
    // If turning water ON, turn fertilizer OFF (but mixer can stay ON)
    if (newWaterState) {
        actuatorStates.water = true;
        actuatorStates.fertilizer = false;
        // Keep mixer state as is
        
        // Update water UI
        const waterStatusEl = document.getElementById('waterStatus');
        const waterIndicatorEl = document.getElementById('waterIndicator');
        waterStatusEl.textContent = 'ON';
        waterIndicatorEl.classList.add('active');
        waterIndicatorEl.classList.remove('inactive');
        
        // Update fertilizer UI to OFF
        const fertilizerStatusEl = document.getElementById('fertilizerStatus');
        const fertilizerIndicatorEl = document.getElementById('fertilizerIndicator');
        fertilizerStatusEl.textContent = 'OFF';
        fertilizerIndicatorEl.classList.add('inactive');
        fertilizerIndicatorEl.classList.remove('active');
        
        // Update Firebase
        update(aktuatorRef, {
            [ACTUATOR_KEYS.water]: true,
            [ACTUATOR_KEYS.fertilizer]: false
        }).then(() => {
            console.log('Water ON, Fertilizer OFF');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    } else {
        // Turning water OFF
        actuatorStates.water = false;
        
        const waterStatusEl = document.getElementById('waterStatus');
        const waterIndicatorEl = document.getElementById('waterIndicator');
        waterStatusEl.textContent = 'OFF';
        waterIndicatorEl.classList.add('inactive');
        waterIndicatorEl.classList.remove('active');
        
        update(aktuatorRef, {
            [ACTUATOR_KEYS.water]: false
        }).then(() => {
            console.log('Water OFF');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    }
};

// Toggle fertilizer actuator (mosvet_2 - Pupuk)
window.toggleFertilizer = function() {
    const newFertilizerState = !actuatorStates.fertilizer;
    
    // Check if all pots are OFF and user is trying to turn fertilizer ON
    if (newFertilizerState && areAllPotsOff()) {
        showNotification('Semua pot dalam status OFF. Aktifkan minimal satu pot sebelum mengaktifkan penyiraman pupuk.');
        return;
    }
    
    // If turning fertilizer ON, turn water OFF (but mixer can stay ON)
    if (newFertilizerState) {
        actuatorStates.fertilizer = true;
        actuatorStates.water = false;
        // Keep mixer state as is
        
        // Update fertilizer UI
        const fertilizerStatusEl = document.getElementById('fertilizerStatus');
        const fertilizerIndicatorEl = document.getElementById('fertilizerIndicator');
        fertilizerStatusEl.textContent = 'ON';
        fertilizerIndicatorEl.classList.add('active');
        fertilizerIndicatorEl.classList.remove('inactive');
        
        // Update water UI to OFF
        const waterStatusEl = document.getElementById('waterStatus');
        const waterIndicatorEl = document.getElementById('waterIndicator');
        waterStatusEl.textContent = 'OFF';
        waterIndicatorEl.classList.add('inactive');
        waterIndicatorEl.classList.remove('active');
        
        // Update Firebase
        update(aktuatorRef, {
            [ACTUATOR_KEYS.water]: false,
            [ACTUATOR_KEYS.fertilizer]: true
        }).then(() => {
            console.log('Fertilizer ON, Water OFF');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    } else {
        // Turning fertilizer OFF
        actuatorStates.fertilizer = false;
        
        const fertilizerStatusEl = document.getElementById('fertilizerStatus');
        const fertilizerIndicatorEl = document.getElementById('fertilizerIndicator');
        fertilizerStatusEl.textContent = 'OFF';
        fertilizerIndicatorEl.classList.add('inactive');
        fertilizerIndicatorEl.classList.remove('active');
        
        update(aktuatorRef, {
            [ACTUATOR_KEYS.fertilizer]: false
        }).then(() => {
            console.log('Fertilizer OFF');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    }
};

// Toggle mixer actuator (mosvet_8 - Pompa pengaduk)
window.toggleMixer = function() {
    const newMixerState = !actuatorStates.mixer;

    const mixerStatusEl = document.getElementById('mixerStatus');
    const mixerIndicatorEl = document.getElementById('mixerIndicator');

    if (!mixerStatusEl || !mixerIndicatorEl) {
        return;
    }

    // Check if all pots are OFF and user is trying to turn mixer ON
    if (newMixerState && areAllPotsOff()) {
        showNotification('Semua pot dalam status OFF. Aktifkan minimal satu pot sebelum mengaktifkan pengaduk larutan nutrisi.');
        return;
    }

    if (newMixerState) {
        actuatorStates.mixer = true;
        // Keep water and fertilizer states as is
        
        mixerStatusEl.textContent = 'ON';
        mixerIndicatorEl.classList.add('active');
        mixerIndicatorEl.classList.remove('inactive');

        update(aktuatorRef, {
            [ACTUATOR_KEYS.mixer]: true
        }).then(() => {
            console.log('Mixer ON');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    } else {
        actuatorStates.mixer = false;
        mixerStatusEl.textContent = 'OFF';
        mixerIndicatorEl.classList.add('inactive');
        mixerIndicatorEl.classList.remove('active');

        update(aktuatorRef, {
            [ACTUATOR_KEYS.mixer]: false
        }).then(() => {
            console.log('Mixer OFF');
        }).catch((error) => {
            console.error('Error updating Firebase:', error);
        });
    }
};

// Check authentication
onAuthStateChanged(auth, (user) => {
    const dashboardPageEl = document.getElementById('dashboardPage');
    const loginMessageEl = document.getElementById('loginMessage');

    if (user) {
        if (dashboardPageEl) dashboardPageEl.hidden = false;
        if (loginMessageEl) loginMessageEl.hidden = true;

        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = user.email;

        window.scrollTo(0, 0);
        
        // Load sensor readings from Firebase (RTDB)
        startSensorSubscription();
        
        // Load actuator states from Firebase
        loadActuatorStates();
    } else {
        if (dashboardPageEl) dashboardPageEl.hidden = true;
        if (loginMessageEl) loginMessageEl.hidden = false;

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }
});

// Load actuator states from Firebase
function loadActuatorStates() {
    onValue(aktuatorRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('Actuator data loaded:', data);
            
            // Update pot states (Pot 1-5 maps to mosvet_3-7)
            for (let i = 1; i <= 5; i++) {
                const mosvetNumber = i + 2;
                const mosvetKey = `mosvet_${mosvetNumber}`;
                if (data[mosvetKey] !== undefined) {
                    potStates[i] = normalizeToggleValue(data[mosvetKey], potStates[i]);
                    const statusEl = document.getElementById(`status${i}`);
                    const indicatorEl = document.getElementById(`indicator${i}`);

                    renderToggleUI(statusEl, indicatorEl, potStates[i]);
                }
            }
            
            // Update water state (mosvet_1)
            if (data[ACTUATOR_KEYS.water] !== undefined) {
                actuatorStates.water = normalizeToggleValue(data[ACTUATOR_KEYS.water], actuatorStates.water);
                const statusEl = document.getElementById('waterStatus');
                const indicatorEl = document.getElementById('waterIndicator');

                renderToggleUI(statusEl, indicatorEl, actuatorStates.water);
            }
            
            // Update fertilizer state (mosvet_2)
            if (data[ACTUATOR_KEYS.fertilizer] !== undefined) {
                actuatorStates.fertilizer = normalizeToggleValue(data[ACTUATOR_KEYS.fertilizer], actuatorStates.fertilizer);
                const statusEl = document.getElementById('fertilizerStatus');
                const indicatorEl = document.getElementById('fertilizerIndicator');

                renderToggleUI(statusEl, indicatorEl, actuatorStates.fertilizer);
            }

            // Update mixer state (mosvet_8)
            if (data[ACTUATOR_KEYS.mixer] !== undefined) {
                actuatorStates.mixer = normalizeToggleValue(data[ACTUATOR_KEYS.mixer], actuatorStates.mixer);
                const statusEl = document.getElementById('mixerStatus');
                const indicatorEl = document.getElementById('mixerIndicator');

                renderToggleUI(statusEl, indicatorEl, actuatorStates.mixer);
            }
        } else {
            // Initialize default values
            initializeDefaultActuatorStates();
        }
    });
}

// Initialize default actuator states
function initializeDefaultActuatorStates() {
    const defaultData = {
        mosvet_1: true,  // Pompa air
        mosvet_2: true,  // Pupuk
        mosvet_3: true,  // Soil 1
        mosvet_4: true,  // Soil 2
        mosvet_5: true,  // Soil 3
        mosvet_6: true,  // Soil 4
        mosvet_7: true,  // Soil 5
        mosvet_8: true   // Pompa pengaduk
    };
    
    set(aktuatorRef, defaultData)
        .then(() => {
            console.log('Default actuator states initialized');
        })
        .catch((error) => {
            console.error('Error initializing actuator states:', error);
        });
}

function pickNumber(...candidates) {
    for (const value of candidates) {
        if (value === null || value === undefined) continue;
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(n)) return n;
    }
    return null;
}

function parseWaterflowAvailability(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['1', 'true', 'on', 'ada', 'available', 'air', 'yes', 'y'].includes(normalized)) return true;
        if (['0', 'false', 'off', 'habis', 'empty', 'no', 'n', ''].includes(normalized)) return false;

        const numeric = Number(normalized);
        if (!Number.isNaN(numeric)) return numeric > 0;
    }

    return Boolean(value);
}

function updateWaterflowBadge(isAvailable) {
    const badge = document.getElementById('waterflowBadge');
    const dot = document.getElementById('waterflowDot');
    const text = document.getElementById('waterflowText');

    if (badge) {
        badge.classList.toggle('has-water', isAvailable);
        badge.classList.toggle('no-water', !isAvailable);
    }

    if (dot) {
        dot.classList.toggle('active', isAvailable);
        dot.classList.toggle('inactive', !isAvailable);
    }

    if (text) {
        text.textContent = isAvailable ? 'AIR TERSEDIA' : 'AIR HABIS';
    }
}

function updateSensorUI(data) {
    if (!data || typeof data !== 'object') return;

    // Temperature
    const temperature = pickNumber(
        data.dhtTemp,
        data.temperature,
        data.temp,
        data.suhu,
        data.suhu_dht,
        data.dht
    );
    if (temperature !== null) {
        const el = document.getElementById('dhtTemp');
        if (el) el.textContent = Math.round(temperature * 10) / 10;
    }

    // Air humidity
    const humidity = pickNumber(
        data.dhtHumidity,
        data.humidity,
        data.kelembapan,
        data.kelembapan_udara,
        data.airHumidity,
        data.air_humidity,
        data.humid
    );
    if (humidity !== null) {
        const el = document.getElementById('dhtHumidity');
        if (el) el.textContent = Math.round(humidity * 10) / 10;
    }

    const waterflowRaw = data.water_flow ?? data.waterflow ?? data.waterFlow;
    const waterflowAvailable = parseWaterflowAvailability(waterflowRaw);
    if (waterflowAvailable !== null) {
        updateWaterflowBadge(waterflowAvailable);
    }

    // Light
    const light = pickNumber(
        data.ldr,
        data.sunLight,
        data.light,
        data.cahaya,
        data.ldr_percent,
        data.lux
    );
    if (light !== null) {
        const el = document.getElementById('sunLight');
        if (el) el.textContent = Math.round(light * 100) / 100;

        const statusEl = document.querySelector('.sensor-light .status');
        if (statusEl) {
            const sunStatus = light < 250 ? 'Gelap' : light < 1000 ? 'Sedang' : light < 2000 ? 'Terang' : 'Sangat Terang';
            statusEl.textContent = sunStatus;
        }
    }

    // Moisture per pot (supports several common shapes)
    const moistureRoot =
        data.moisture ||
        data.kelembaban ||
        data.soilMoisture ||
        data.soil_moisture ||
        data.kelembaban_tanah ||
        null;

    const moistureArray =
        (Array.isArray(data.moisture) && data.moisture) ||
        (Array.isArray(data.kelembaban) && data.kelembaban) ||
        (Array.isArray(data.soilMoisture) && data.soilMoisture) ||
        (Array.isArray(data.soil_moisture) && data.soil_moisture) ||
        null;

    let resolvedSoilCount = 0;

    for (let i = 1; i <= 5; i++) {
        const direct = pickNumber(
            data[`moisture${i}`],
            data[`moisture_${i}`],
            data[`moisturePot${i}`],
            data[`moisture_pot_${i}`],
            data[`kelembaban${i}`],
            data[`kelembaban_${i}`],
            data[`kelembabanTanah${i}`],
            data[`kelembaban_tanah_${i}`],
            data[`soil${i}`],
            data[`soil_${i}`],
            data[`soilMoisture${i}`],
            data[`soil_moisture_${i}`],
            data[`humidity${i}`],
            data[`humidity_${i}`],
            data[`adc${i}`],
            data[`adc_${i}`],
            data[`sensor${i}`],
            data[`sensor_${i}`],
            data[`pot${i}`],
            data[`pot_${i}`]
        );

        const fromArray = moistureArray ? pickNumber(moistureArray[i - 1], moistureArray[i], moistureArray[String(i)]) : null;

        const nested = moistureRoot
            ? pickNumber(
                moistureRoot[i],
                moistureRoot[String(i)],
                moistureRoot[`pot${i}`],
                moistureRoot[`pot_${i}`],
                moistureRoot[`sensor${i}`],
                moistureRoot[`sensor_${i}`],
                moistureRoot[`soil${i}`],
                moistureRoot[`soil_${i}`],
                moistureRoot[`moisture${i}`],
                moistureRoot[`moisture_${i}`],
                moistureRoot[`kelembaban${i}`],
                moistureRoot[`kelembaban_${i}`]
            )
            : null;

        const directPotNode =
            data[`pot${i}`] ||
            data[`pot_${i}`] ||
            data[`sensor${i}`] ||
            data[`sensor_${i}`] ||
            null;

        const potNode = (data.pots && (data.pots[i] || data.pots[String(i)] || data.pots[`pot${i}`]))
            || (data.pot && (data.pot[i] || data.pot[String(i)] || data.pot[`pot${i}`]))
            || directPotNode;

        const potMoisture = potNode
            ? pickNumber(
                potNode,
                potNode.moisture,
                potNode.kelembaban,
                potNode.soil,
                potNode.soil_moisture,
                potNode.soilMoisture,
                potNode.kelembaban_tanah,
                potNode.humidity,
                potNode.adc,
                potNode.value,
                potNode.nilai
            )
            : null;

        const value = pickNumber(direct, fromArray, nested, potMoisture);
        if (value !== null) {
            const el = document.getElementById(`moisture${i}`);
            if (el) el.textContent = Math.round(value);
            resolvedSoilCount++;
        }
    }

    if (resolvedSoilCount === 0 && !didLogSoilDebug) {
        didLogSoilDebug = true;
        console.warn('[Sensor] Soil values not mapped yet. Available keys:', Object.keys(data || {}));
    }
}

async function findFirstExistingPath(paths) {
    for (const path of paths) {
        try {
            const snapshot = await get(ref(database, path));
            if (snapshot.exists()) return path;
        } catch (error) {
            console.warn(`[Sensor] Cannot probe path '${path}':`, error);
        }
    }
    return paths[0];
}

function looksLikeSensorObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    return keys.some((k) =>
        /temp|suhu|dht|cahaya|light|ldr|lux|moisture|kelembaban|soil/i.test(k)
    );
}

async function detectSensorPathFromRoot() {
    // Best-effort: read root, then pick a child node that contains sensor-ish fields.
    try {
        const rootRef = ref(database, '/');
        const rootSnap = await get(rootRef);
        if (!rootSnap.exists()) return null;
        const rootVal = rootSnap.val();

        if (!rootVal || typeof rootVal !== 'object') return null;
        const topKeys = Object.keys(rootVal);
        console.log('[Sensor] RTDB root keys:', topKeys);

        for (const key of topKeys) {
            const child = rootVal[key];
            if (looksLikeSensorObject(child)) {
                return key;
            }
        }
        return null;
    } catch (error) {
        console.warn('[Sensor] Root probe failed (rules/network):', error);
        return null;
    }
}

let stopSensorSubscription = null;
let didLogFirstSensorPayload = false;
let didLogSoilDebug = false;
let sensorCandidateIndex = 0;

async function startSensorSubscription(forcedPath = null, attempt = 0) {
    try {
        if (typeof stopSensorSubscription === 'function') {
            stopSensorSubscription();
            stopSensorSubscription = null;
        }

        const overridePath = typeof SENSOR_PATH_OVERRIDE === 'string' ? SENSOR_PATH_OVERRIDE.trim() : '';
        if (!forcedPath && overridePath) {
            forcedPath = overridePath;
        }

        // 1) If forcedPath provided, use it directly
        // 2) Try root-based detection (most accurate)
        // 3) Otherwise, try candidates (fallback)
        const detected = forcedPath ? null : await detectSensorPathFromRoot();
        const sensorPath = forcedPath || detected || (await findFirstExistingPath(SENSOR_PATH_CANDIDATES));
        console.log(
            '[Sensor] Subscribing to:',
            sensorPath,
            forcedPath ? '(forced)' : (detected ? '(detected)' : '(fallback)')
        );

        stopSensorSubscription = onValue(
            ref(database, sensorPath),
            (snapshot) => {
                if (!snapshot.exists()) {
                    console.warn('[Sensor] No data at path:', sensorPath);

                    // If we got here via fallback and there is no data, try the next candidate.
                    // This helps when the real sensor node name is different.
                    if (!forcedPath && !detected && SENSOR_PATH_CANDIDATES.length > 1) {
                        if (attempt < SENSOR_PATH_CANDIDATES.length - 1) {
                            const nextIndex = (sensorCandidateIndex + 1) % SENSOR_PATH_CANDIDATES.length;
                            sensorCandidateIndex = nextIndex;
                            const nextPath = SENSOR_PATH_CANDIDATES[sensorCandidateIndex];
                            if (nextPath !== sensorPath) {
                                console.log('[Sensor] Trying next path:', nextPath);
                                startSensorSubscription(nextPath, attempt + 1);
                            }
                        } else {
                            console.warn('[Sensor] All sensor path candidates returned empty. Set the correct RTDB path in app.js');
                        }
                    }
                    return;
                }
                const payload = snapshot.val();
                if (!didLogFirstSensorPayload) {
                    didLogFirstSensorPayload = true;
                    console.log('[Sensor] First payload:', payload);
                }
                updateSensorUI(payload);
            },
            (error) => {
                console.error('[Sensor] Subscription error:', error);
            }
        );
    } catch (error) {
        console.error('[Sensor] Failed to start subscription:', error);
    }
}

// Sign out function
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('User signed out');
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error(error);
        });
    });
}