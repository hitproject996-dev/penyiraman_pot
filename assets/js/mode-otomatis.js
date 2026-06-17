// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import { getDatabase, ref, onValue, update } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyCQWvoDxDyVCuLEDiwammjUIVYxVARzJig',
    authDomain: 'project-ta-951b4.firebaseapp.com',
    databaseURL: 'https://project-ta-951b4-default-rtdb.firebaseio.com',
    projectId: 'project-ta-951b4',
    storageBucket: 'project-ta-951b4.firebasestorage.app',
    messagingSenderId: '217854138058',
    appId: '1:217854138058:web:50a5bcd5a61ac1820c4633',
    measurementId: 'G-6ML8QQEGNZ'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const KONTROL_BASE_PATH = 'kontrol_1';
const kontrolRef = ref(database, KONTROL_BASE_PATH);

let activeThresholdKey = 'threshold_1';
let thresholdProfiles = ['threshold_1'];
let lastKontrolData = {};
let mainModeActive = false;
let isPageLoaded = false;

function clampNumber(value, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return min;
    }

    return Math.min(Math.max(parsed, min), max);
}

function normalizePotValue(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'on', 'aktif', 'yes', 'y'].includes(normalized)) {
            return true;
        }
        if (['0', 'false', 'off', 'nonaktif', 'no', 'n', ''].includes(normalized)) {
            return false;
        }

        const numeric = Number(normalized);
        if (!Number.isNaN(numeric)) {
            return numeric !== 0;
        }
    }

    return false;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getThresholdNumber(thresholdKey) {
    const match = String(thresholdKey || '').match(/^threshold_(\d+)$/i);
    return match ? parseInt(match[1], 10) : 1;
}

function getThresholdLabel(thresholdKey) {
    return `Threshold ${getThresholdNumber(thresholdKey)}`;
}

function extractThresholdKeys(data) {
    const keys = Object.keys(data || {})
        .filter((key) => /^threshold_\d+$/i.test(key))
        .sort((a, b) => getThresholdNumber(a) - getThresholdNumber(b));

    return keys.length > 0 ? keys : ['threshold_1'];
}

function resolveThresholdKey(value) {
    if (!value) {
        return thresholdProfiles[0] || 'threshold_1';
    }

    return thresholdProfiles.includes(value) ? value : (thresholdProfiles[0] || 'threshold_1');
}

function normalizePotAktif(potAktifSource = {}) {
    if (Array.isArray(potAktifSource)) {
        const normalized = { pot_1: false, pot_2: false, pot_3: false, pot_4: false, pot_5: false };
        potAktifSource.forEach((value) => {
            const potNumber = Number(value);
            if (Number.isFinite(potNumber) && potNumber >= 1 && potNumber <= 5) {
                normalized[`pot_${potNumber}`] = true;
            }
        });
        return normalized;
    }

    if (potAktifSource && typeof potAktifSource === 'object') {
        const numericKeys = Object.keys(potAktifSource).filter((key) => /^\d+$/.test(key));
        if (numericKeys.length > 0) {
            const normalized = { pot_1: false, pot_2: false, pot_3: false, pot_4: false, pot_5: false };
            Object.values(potAktifSource).forEach((value) => {
                const potNumber = Number(value);
                if (Number.isFinite(potNumber) && potNumber >= 1 && potNumber <= 5) {
                    normalized[`pot_${potNumber}`] = true;
                }
            });
            return normalized;
        }
    }

    return {
        pot_1: normalizePotValue(potAktifSource.pot_1 ?? potAktifSource.pot1),
        pot_2: normalizePotValue(potAktifSource.pot_2 ?? potAktifSource.pot2),
        pot_3: normalizePotValue(potAktifSource.pot_3 ?? potAktifSource.pot3),
        pot_4: normalizePotValue(potAktifSource.pot_4 ?? potAktifSource.pot4),
        pot_5: normalizePotValue(potAktifSource.pot_5 ?? potAktifSource.pot5)
    };
}

function getThresholdDataByKey(data, thresholdKey) {
    const source = data?.[thresholdKey] || {};
    const batasBawah = Number(source.batas_bawah);
    const batasAtas = Number(source.batas_atas);
    const namaTanaman = String(source.nama_tanaman || '').trim();

    return {
        nama_tanaman: namaTanaman || getThresholdLabel(thresholdKey),
        batas_bawah: Number.isFinite(batasBawah) ? batasBawah : 30,
        batas_atas: Number.isFinite(batasAtas) ? batasAtas : 70,
        pot_aktif: normalizePotAktif(source.pot_aktif),
        pompa_air: source.pompa_air === true,
        pompa_pupuk: source.pompa_pupuk === true,
        pompa_pengaduk: source.pompa_pengaduk === true,
        aktif: source.aktif === true,
        smart_mode: source.smart_mode === true
    };
}

function getActiveThresholdData(data) {
    return getThresholdDataByKey(data, activeThresholdKey);
}

function getNextThresholdKey() {
    const indices = thresholdProfiles
        .map(getThresholdNumber)
        .filter((value) => Number.isFinite(value));

    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 1;
    return `threshold_${nextIndex}`;
}

function getPumpType(thresholdData) {
    if (thresholdData.pompa_pengaduk) {
        return 'pengaduk';
    }

    if (thresholdData.pompa_pupuk) {
        return 'nutrisi';
    }

    return 'air';
}

function getPumpLabelByType(type) {
    switch (type) {
    case 'nutrisi':
        return 'Pompa Nutrisi';
    case 'pengaduk':
        return 'Pengaduk';
    default:
        return 'Pompa Air';
    }
}

function getPumpIconByType(type) {
    switch (type) {
    case 'nutrisi':
        return 'fas fa-flask';
    case 'pengaduk':
        return 'fas fa-blender';
    default:
        return 'fas fa-water';
    }
}

function getPotSummary(thresholdData) {
    const selectedPots = [];

    for (let i = 1; i <= 5; i++) {
        if (thresholdData.pot_aktif[`pot_${i}`] === true) {
            selectedPots.push(`Pot ${i}`);
        }
    }

    return selectedPots.length > 0 ? selectedPots.join(', ') : 'Belum ada pot dipilih';
}

function setMainModeVisual(isActive) {
    const mainToggle = document.getElementById('mainToggle');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const addThresholdBtn = document.getElementById('btnAddThreshold');
    const saveThresholdBtn = document.getElementById('btnSaveThreshold');

    if (mainToggle) {
        mainToggle.classList.toggle('active', isActive);
    }

    if (statusIndicator) {
        statusIndicator.classList.toggle('active', isActive);
    }

    if (statusText) {
        statusText.textContent = isActive ? 'Aktif' : 'Tidak Aktif';
    }

    if (addThresholdBtn) {
        addThresholdBtn.disabled = !isActive;
    }

    if (saveThresholdBtn) {
        saveThresholdBtn.disabled = !isActive;
    }
}

function updateThresholdProfileUI() {
    const activeLabel = document.getElementById('activeThresholdLabel');
    const container = document.getElementById('thresholdProfileContainer');

    if (activeLabel) {
        const activeData = getThresholdDataByKey(lastKontrolData, activeThresholdKey);
        activeLabel.textContent = `Profil aktif: ${getThresholdLabel(activeThresholdKey)} - ${activeData.nama_tanaman}`;
    }

    if (!container) {
        return;
    }

    container.innerHTML = thresholdProfiles.map((thresholdKey) => {
        const thresholdData = getThresholdDataByKey(lastKontrolData, thresholdKey);
        const isActive = thresholdKey === activeThresholdKey;
        const pumpType = getPumpType(thresholdData);
        const deleteDisabled = thresholdProfiles.length <= 1 || !mainModeActive;
        const safePlantName = escapeHtml(thresholdData.nama_tanaman);

        return `
            <div class="threshold-profile-item ${isActive ? 'active' : ''}">
                <div class="threshold-profile-item-main">
                    <div class="threshold-profile-item-title-row">
                        <div class="threshold-profile-item-title">${getThresholdLabel(thresholdKey)}</div>
                        ${isActive ? '<span class="threshold-active-badge">Aktif</span>' : ''}
                    </div>
                    <div class="threshold-profile-item-meta"><i class="fas fa-tag"></i> Nama: ${safePlantName}</div>
                    <div class="threshold-profile-item-meta"><i class="fas fa-sliders-h"></i> Batas: ${thresholdData.batas_bawah}% - ${thresholdData.batas_atas}%</div>
                    <div class="threshold-profile-item-meta"><i class="fas fa-seedling"></i> Pot: ${getPotSummary(thresholdData)}</div>
                    <div class="threshold-profile-item-meta"><i class="${getPumpIconByType(pumpType)}"></i> Penyiraman: ${getPumpLabelByType(pumpType)}</div>
                </div>
                <div class="threshold-profile-item-actions">
                    <button type="button" class="threshold-action-btn btn-activate-threshold ${isActive ? 'active' : ''}" data-threshold-action="select" data-threshold-key="${thresholdKey}" ${!mainModeActive ? 'disabled' : ''}>${isActive ? 'Aktif' : 'Pilih'}</button>
                    <button type="button" class="threshold-action-btn btn-edit-threshold" data-threshold-action="edit" data-threshold-key="${thresholdKey}" ${!mainModeActive ? 'disabled' : ''}>Edit</button>
                    <button type="button" class="threshold-action-btn btn-delete-threshold" data-threshold-action="delete" data-threshold-key="${thresholdKey}" ${deleteDisabled ? 'disabled' : ''}>Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

async function switchThresholdProfile(selectedKey) {
    if (!mainModeActive) {
        showNotification('Aktifkan Mode Otomatis terlebih dahulu', 'warning');
        return;
    }

    const thresholdKey = resolveThresholdKey(selectedKey);
    if (thresholdKey === activeThresholdKey) {
        return;
    }

    const previousKey = activeThresholdKey;
    activeThresholdKey = thresholdKey;
    updateThresholdProfileUI();

    try {
        await update(kontrolRef, {
            threshold_aktif: thresholdKey
        });
        showNotification(`Berpindah ke ${getThresholdLabel(thresholdKey)}`, 'info');
    } catch (error) {
        console.error('Error switching threshold profile:', error);
        activeThresholdKey = previousKey;
        updateThresholdProfileUI();
        showNotification('Gagal mengganti profil threshold', 'error');
    }
}

function openThresholdModal(thresholdKey = null) {
    if (!mainModeActive) {
        showNotification('Aktifkan Mode Otomatis terlebih dahulu', 'warning');
        return;
    }

    const modal = document.getElementById('thresholdModal');
    const title = document.getElementById('thresholdModalTitle');
    const editInput = document.getElementById('editThresholdKey');
    const plantNameInput = document.getElementById('thresholdPlantName');
    const minInput = document.getElementById('thresholdMinInput');
    const maxInput = document.getElementById('thresholdMaxInput');

    if (!modal || !title || !editInput || !plantNameInput || !minInput || !maxInput) {
        return;
    }

    const isEditMode = Boolean(thresholdKey);
    const sourceData = isEditMode
        ? getThresholdDataByKey(lastKontrolData, thresholdKey)
        : getActiveThresholdData(lastKontrolData);

    title.innerHTML = isEditMode
        ? '<i class="fas fa-edit"></i> Edit Threshold'
        : '<i class="fas fa-layer-group"></i> Tambah Threshold';

    editInput.value = isEditMode ? thresholdKey : '';
    plantNameInput.value = isEditMode ? (sourceData.nama_tanaman || '') : '';
    minInput.value = sourceData.batas_bawah;
    maxInput.value = sourceData.batas_atas;

    const potCheckboxes = document.querySelectorAll('.threshold-pot-checkbox');
    potCheckboxes.forEach((checkbox) => {
        const potNumber = checkbox.value.replace('pot', '');
        checkbox.checked = sourceData.pot_aktif[`pot_${potNumber}`] === true;
    });

    const pumpType = getPumpType(sourceData);
    const pumpRadio = document.querySelector(`input[name="thresholdPumpType"][value="${pumpType}"]`);
    if (pumpRadio) {
        pumpRadio.checked = true;
    }

    modal.style.display = 'flex';
}

window.closeThresholdModal = function() {
    const modal = document.getElementById('thresholdModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.selectAllThresholdPotsModal = function() {
    document.querySelectorAll('.threshold-pot-checkbox').forEach((checkbox) => {
        checkbox.checked = true;
    });
};

window.deselectAllThresholdPotsModal = function() {
    document.querySelectorAll('.threshold-pot-checkbox').forEach((checkbox) => {
        checkbox.checked = false;
    });
};

function getThresholdPayloadFromForm() {
    const editThresholdKey = document.getElementById('editThresholdKey')?.value || '';
    const fallbackKey = editThresholdKey || activeThresholdKey;
    const plantNameInput = document.getElementById('thresholdPlantName');
    const minInput = document.getElementById('thresholdMinInput');
    const maxInput = document.getElementById('thresholdMaxInput');
    const namaTanaman = String(plantNameInput?.value || '').trim();

    if (!namaTanaman) {
        showNotification('Nama tanaman untuk threshold wajib diisi', 'warning');
        return null;
    }

    const batasBawah = clampNumber(minInput?.value, 0, 99);
    const batasAtas = clampNumber(maxInput?.value, 1, 100);

    if (batasBawah >= batasAtas) {
        showNotification('Batas bawah harus lebih kecil dari batas atas', 'warning');
        return null;
    }

    const selectedPotValues = Array.from(document.querySelectorAll('.threshold-pot-checkbox:checked'))
        .map((checkbox) => checkbox.value);

    if (selectedPotValues.length === 0) {
        showNotification('Pilih minimal 1 pot untuk threshold', 'warning');
        return null;
    }

    const selectedPump = document.querySelector('input[name="thresholdPumpType"]:checked')?.value || 'air';

    const potAktifList = Array.from(new Set(
        selectedPotValues
            .map((pot) => Number(String(pot).replace('pot', '')))
            .filter((potNumber) => Number.isFinite(potNumber) && potNumber >= 1 && potNumber <= 5)
    ));

    return {
        nama_tanaman: namaTanaman || getThresholdLabel(fallbackKey),
        aktif: mainModeActive,
        smart_mode: mainModeActive,
        batas_bawah: batasBawah,
        batas_atas: batasAtas,
        pot_aktif: potAktifList,
        pompa_air: selectedPump === 'air',
        pompa_pupuk: selectedPump === 'nutrisi',
        pompa_pengaduk: selectedPump === 'pengaduk'
    };
}

window.saveThresholdProfile = async function() {
    if (!mainModeActive) {
        showNotification('Aktifkan Mode Otomatis terlebih dahulu', 'warning');
        return;
    }

    const payload = getThresholdPayloadFromForm();
    if (!payload) {
        return;
    }

    const editThresholdKey = document.getElementById('editThresholdKey')?.value || '';
    const isEditMode = editThresholdKey !== '';
    const targetKey = isEditMode ? resolveThresholdKey(editThresholdKey) : getNextThresholdKey();

    const updates = {
        [targetKey]: payload
    };

    if (!isEditMode) {
        updates.threshold_aktif = targetKey;
    }

    try {
        await update(kontrolRef, updates);
        closeThresholdModal();
        showNotification(
            isEditMode
                ? `${getThresholdLabel(targetKey)} berhasil diperbarui`
                : `${getThresholdLabel(targetKey)} berhasil ditambahkan`,
            'success'
        );
    } catch (error) {
        console.error('Error saving threshold profile:', error);
        showNotification('Gagal menyimpan threshold', 'error');
    }
};

async function deleteThresholdProfile(thresholdKey) {
    if (!mainModeActive) {
        showNotification('Aktifkan Mode Otomatis terlebih dahulu', 'warning');
        return;
    }

    if (!thresholdProfiles.includes(thresholdKey)) {
        return;
    }

    if (thresholdProfiles.length <= 1) {
        showNotification('Minimal harus ada 1 profil threshold', 'warning');
        return;
    }

    if (!confirm(`Hapus ${getThresholdLabel(thresholdKey)}?`)) {
        return;
    }

    const fallbackKey = thresholdProfiles.find((key) => key !== thresholdKey) || 'threshold_1';
    const updates = {
        [thresholdKey]: null
    };

    if (activeThresholdKey === thresholdKey) {
        updates.threshold_aktif = fallbackKey;
    }

    try {
        await update(kontrolRef, updates);
        showNotification(`${getThresholdLabel(thresholdKey)} berhasil dihapus`, 'success');
    } catch (error) {
        console.error('Error deleting threshold profile:', error);
        showNotification('Gagal menghapus profil threshold', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) {
        return;
    }

    notification.className = `notification ${type}`;

    const icon = notification.querySelector('.notification-icon');
    if (icon) {
        if (type === 'success') {
            icon.className = 'notification-icon fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'notification-icon fas fa-exclamation-circle';
        } else if (type === 'info') {
            icon.className = 'notification-icon fas fa-info-circle';
        } else if (type === 'warning') {
            icon.className = 'notification-icon fas fa-exclamation-triangle';
        }
    }

    const messageEl = notification.querySelector('.notification-message');
    if (messageEl) {
        messageEl.textContent = message;
    }

    notification.classList.add('show');
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }, 3000);
}

function loadControllerData() {
    onValue(kontrolRef, (snapshot) => {
        const data = snapshot.exists() ? snapshot.val() : {};

        lastKontrolData = data;
        thresholdProfiles = extractThresholdKeys(data);

        if (data.threshold_aktif) {
            activeThresholdKey = resolveThresholdKey(data.threshold_aktif);
        } else {
            activeThresholdKey = resolveThresholdKey(activeThresholdKey);
        }

        mainModeActive = data.otomatis === true || data.otomatis === 1;
        setMainModeVisual(mainModeActive);
        updateThresholdProfileUI();
    });
}

window.toggleMainMode = function() {
    if (!isPageLoaded) {
        return;
    }

    const nextState = !mainModeActive;
    mainModeActive = nextState;

    setMainModeVisual(mainModeActive);
    updateThresholdProfileUI();

    // Ketika Mode Otomatis diaktifkan, matikan Mode Waktu
    // Ketika Mode Otomatis dimatikan, Mode Waktu tetap bisa digunakan
    update(kontrolRef, {
        otomatis: nextState,
        waktu: nextState ? false : undefined,
        [`${activeThresholdKey}/aktif`]: nextState,
        [`${activeThresholdKey}/smart_mode`]: nextState,
        threshold_aktif: activeThresholdKey
    }).then(() => {
        showNotification(nextState ? 'Mode Otomatis diaktifkan' : 'Mode Otomatis dinonaktifkan', nextState ? 'success' : 'info');
    }).catch((error) => {
        console.error('Error updating mode status:', error);
        mainModeActive = !nextState;
        setMainModeVisual(mainModeActive);
        updateThresholdProfileUI();
        showNotification('Gagal menyimpan status mode', 'error');
    });
};

onAuthStateChanged(auth, (user) => {
    const loginMessage = document.getElementById('loginMessage');

    if (user) {
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('dashboardPage').style.display = 'block';
        if (loginMessage) {
            loginMessage.hidden = true;
        }

        loadControllerData();
        isPageLoaded = true;
    } else {
        document.getElementById('dashboardPage').style.display = 'none';
        if (loginMessage) {
            loginMessage.hidden = false;
        }

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }
});

document.getElementById('signOutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../index.html';
    } catch (error) {
        showNotification(`Error logging out: ${error.message}`, 'error');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    setMainModeVisual(false);
    updateThresholdProfileUI();

    document.getElementById('btnAddThreshold')?.addEventListener('click', () => {
        openThresholdModal();
    });

    document.getElementById('thresholdProfileContainer')?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('[data-threshold-action]');
        if (!actionBtn) {
            return;
        }

        const action = actionBtn.dataset.thresholdAction;
        const thresholdKey = actionBtn.dataset.thresholdKey;
        if (!thresholdKey) {
            return;
        }

        if (action === 'select') {
            switchThresholdProfile(thresholdKey);
            return;
        }

        if (action === 'edit') {
            openThresholdModal(thresholdKey);
            return;
        }

        if (action === 'delete') {
            deleteThresholdProfile(thresholdKey);
        }
    });

    document.getElementById('thresholdModal')?.addEventListener('click', (event) => {
        if (event.target.id === 'thresholdModal') {
            closeThresholdModal();
        }
    });

    document.getElementById('thresholdMinInput')?.addEventListener('change', (event) => {
        const minInput = event.target;
        minInput.value = clampNumber(minInput.value, 0, 99);
    });

    document.getElementById('thresholdMaxInput')?.addEventListener('change', (event) => {
        const maxInput = event.target;
        maxInput.value = clampNumber(maxInput.value, 1, 100);
    });

    document.getElementById('thresholdPlantName')?.addEventListener('change', (event) => {
        event.target.value = String(event.target.value || '').trim();
    });
});
