// Photo Selection Logic - Google Drive Integration (Serverless JSONP via Google Apps Script)
document.addEventListener('DOMContentLoaded', () => {
    // 🔗 FINAL JSONP GOOGLE APPS SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw8Avtaq59zC44kDPLW2EDxKoLm4Y3zgKkF6G4eQj3U_qR3EYfCxETSvFBp245yNWPnmg/exec";
    
    // UI Elements
    const authContainer = document.getElementById('selection-auth-container');
    const studioDashboard = document.getElementById('studio-dashboard');
    const mainContainer = document.getElementById('selection-main-container');
    const selectionGrid = document.getElementById('selection-grid');
    const selectionFooter = document.getElementById('selection-footer');
    const selectedCount = document.getElementById('selected-count');
    const submitBtn = document.getElementById('submit-selection');
    const folderLinkInput = document.getElementById('folder-link-input');
    const loadFolderBtn = document.getElementById('btn-load-folder');

    let selectedPhotos = new Set(); 
    let currentFolderId = ''; 
    let clientName = 'Guest';

    // --- Modern Notification System Helpers ---
    
    // 1. Toast Notification
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 4s
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode === container) container.removeChild(toast);
            }, 300);
        }, 3500);
    };

    // 2. Custom Confirm Modal
    window.showConfirm = function(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm-modal');
            const titleEl = document.getElementById('modal-title');
            const messageEl = document.getElementById('modal-message');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            
            if (!modal) {
                resolve(confirm(message));
                return;
            }
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.style.display = 'flex';
            
            const cleanup = (result) => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            };
            
            const onConfirm = () => cleanup(true);
            const onCancel = () => cleanup(false);
            
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    };

    // --- JSONP HELPER FUNCTION (Bypasses CORS errors completely) ---
    function callGAS(params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_cb_' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
                delete window[callbackName];
                const scriptTag = document.getElementById(callbackName);
                if (scriptTag) document.body.removeChild(scriptTag);
                resolve(data);
            };
            
            const script = document.createElement('script');
            script.id = callbackName;
            const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
            script.src = `${SCRIPT_URL}${SCRIPT_URL.includes('?') ? '&' : '?'}callback=${callbackName}&${queryString}`;
            
            script.onerror = () => {
                delete window[callbackName];
                const scriptTag = document.getElementById(callbackName);
                if (scriptTag) document.body.removeChild(scriptTag);
                reject(new Error("Network Error: Could not reach Google Script. Check your URL."));
            };
            document.body.appendChild(script);
        });
    }

    // Initial State Check
    async function initSelection() {
        const urlParams = new URLSearchParams(window.location.search);
        const folderIdParam = urlParams.get('folderId');
        const clientNameParam = urlParams.get('client');

        if (folderIdParam) {
            showSelectionView(false);
            if (clientNameParam) {
                clientName = clientNameParam;
                loadPhotos(folderIdParam);
            } else {
                if (document.getElementById('guest-modal')) document.getElementById('guest-modal').style.display = 'flex';
            }
        } else {
            showAuth();
        }
    }

    // Modal Listener
    document.getElementById('btn-start-selection')?.addEventListener('click', () => {
        const nameInput = document.getElementById('guest-name-input');
        if (nameInput && nameInput.value.trim()) {
            clientName = nameInput.value.trim();
            document.getElementById('guest-modal').style.display = 'none';
            const urlParams = new URLSearchParams(window.location.search);
            const folderIdParam = urlParams.get('folderId');
            if (folderIdParam) loadPhotos(folderIdParam);
        } else {
            showToast('Please enter your name.', 'error');
        }
    });

    // Copy Link Listener
    document.getElementById('btn-copy-link')?.addEventListener('click', () => {
        let folderIdToShare = currentFolderId;
        if (!folderIdToShare && folderLinkInput) {
            const url = folderLinkInput.value.trim();
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            folderIdToShare = folderIdMatch ? folderIdMatch[1] : (url.length > 20 ? url : null);
        }
        if (!folderIdToShare) {
            showToast('Load a folder first!', 'error');
            return;
        }
        const shareUrl = `${window.location.origin}${window.location.pathname}?folderId=${folderIdToShare}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Sharing link copied to clipboard!');
        });
    });

    // Navigation
    function showAuth() {
        if (authContainer) authContainer.style.display = 'block';
        if (studioDashboard) studioDashboard.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'none';
        
        const setupBtn = document.getElementById('google-login-btn');
        if (setupBtn) {
            setupBtn.innerHTML = `<button id="admin-setup-portal" class="btn-primary" style="margin-top: 10px;"><i class="fas fa-tools"></i> Open Admin Dashboard</button>`;
            document.getElementById('admin-setup-portal').onclick = () => showSelectionView(true);
        }
    }

    function showSelectionView(isAdmin = false) {
        if (authContainer) authContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        if (isAdmin) {
            document.getElementById('admin-tools').style.display = 'block';
            document.getElementById('admin-input-container').style.display = 'flex';
            document.getElementById('persistent-token-status').innerHTML = '<span style="color: #2ecc71; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> JSONP Portal Active</span>';
        } else {
            document.getElementById('admin-tools').style.display = 'none';
            document.getElementById('admin-input-container').style.display = 'none';
        }
        selectionGrid.innerHTML = '<p style="text-align:center; padding: 40px; color:rgba(255,255,255,0.5);">Paste a Google Drive link above to load photos.</p>';
        selectionFooter.style.display = 'none';
    }

    let allPhotos = []; 
    let currentPhotoIndex = -1;

    // Drive API Calls (via callGAS helper)
    async function loadPhotos(folderId) {
        if (!folderId) return;
        currentFolderId = folderId;
        selectionGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading Photos from Google Drive...</div>';
        selectionFooter.style.display = 'none';
        selectedPhotos.clear();
        updateSelectedCount();

        try {
            const data = await callGAS({ action: 'fetch', folderId: folderId });
            if (data.error) throw new Error(data.error);

            selectionGrid.innerHTML = '';
            allPhotos = data.photos || []; 
            
            if (allPhotos.length > 0) {
                allPhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'selection-item';
                    photoDiv.innerHTML = `
                        <div class="preview-icon"><i class="fas fa-expand"></i></div>
                        <img src="${photo.thumbnail}" alt="${photo.name}" loading="lazy" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                        <div class="selection-overlay"><i class="fas fa-check-circle"></i></div>
                    `;
                    photoDiv.addEventListener('click', (e) => {
                        if (e.target.closest('.preview-icon')) return;
                        photoDiv.classList.toggle('selected');
                        if (photoDiv.classList.contains('selected')) selectedPhotos.add(photo.id);
                        else selectedPhotos.delete(photo.id);
                        updateSelectedCount();
                    });
                    photoDiv.querySelector('.preview-icon').addEventListener('click', (e) => {
                        e.stopPropagation();
                        openLightbox(index);
                    });
                    selectionGrid.appendChild(photoDiv);
                });
                selectionFooter.style.display = 'flex';
            } else {
                selectionGrid.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No photos found in this folder.</p>';
            }
        } catch (err) {
            selectionGrid.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center; width: 100%;">Error: ${err.message}</div>`;
        }
    }

    // Lightbox Logic
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    let currentZoom = 1;

    function openLightbox(index) {
        if (index < 0 || index >= allPhotos.length) return;
        currentPhotoIndex = index;
        const photo = allPhotos[index];
        currentZoom = 1;
        if (lightboxImg) {
            lightboxImg.style.transform = `scale(1)`;
            lightboxImg.src = photo.thumbnail.replace('=s400', '=s1600');
            lightboxCaption.textContent = photo.name;
        }
        lightboxModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        updateLightboxSelectBtn();
    }

    function closeLightbox() {
        lightboxModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function updateLightboxSelectBtn() {
        const selectBtn = document.getElementById('lightbox-select');
        const isSelected = selectedPhotos.has(allPhotos[currentPhotoIndex].id);
        if (selectBtn) selectBtn.classList.toggle('selected', isSelected);
    }

    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', () => openLightbox(currentPhotoIndex - 1));
    document.getElementById('lightbox-next')?.addEventListener('click', () => openLightbox(currentPhotoIndex + 1));
    document.getElementById('lightbox-select')?.addEventListener('click', () => {
        const photo = allPhotos[currentPhotoIndex];
        const gridItem = selectionGrid.children[currentPhotoIndex];
        if (selectedPhotos.has(photo.id)) {
            selectedPhotos.delete(photo.id);
            gridItem?.classList.remove('selected');
        } else {
            selectedPhotos.add(photo.id);
            gridItem?.classList.add('selected');
        }
        updateSelectedCount();
        updateLightboxSelectBtn();
    });

    function updateSelectedCount() {
        if (selectedCount) selectedCount.textContent = selectedPhotos.size;
    }

    // Submit Selection (Using custom confirm modal)
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (selectedPhotos.size === 0) {
                showToast('Select some photos first!', 'error');
                return;
            }
            
            const confirmed = await showConfirm('Confirm Selection', `Add ${selectedPhotos.size} photos to your selection folder?`);
            if (!confirmed) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const selectedFilesJoined = Array.from(selectedPhotos).join(',');
            
            try {
                // Single Batch Request for all files
                const res = await callGAS({ 
                    action: 'batchAddSelection', 
                    fileIds: selectedFilesJoined, 
                    parentFolderId: currentFolderId, 
                    customerName: clientName 
                });

                if (res.success) {
                    const successCount = res.count || selectedPhotos.size;
                    const waMessage = encodeURIComponent(`नमस्ते! मेरो फोटो सेलेक्सन पूर्ण भयो।\nनाम: ${clientName}\nजम्मा फोटो: ${successCount}\nकृपया चेक गर्नुहोला।`);
                    
                    showToast(`Selection Complete! ${successCount} photos moved to selection folder.`, 'success');
                    
                    setTimeout(() => {
                        window.open(`https://wa.me/9779852688256?text=${waMessage}`, '_blank');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirm & Send Selection';
                        
                        selectedPhotos.clear();
                        updateSelectedCount();
                        document.querySelectorAll('.selection-item.selected').forEach(el => el.classList.remove('selected'));
                    }, 1000);
                } else {
                    throw new Error(res.error || 'Failed to save selection.');
                }
            } catch (err) {
                console.error("Save error:", err);
                showToast(`Error: ${err.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirm & Send Selection';
            }
        });
    }

    if (loadFolderBtn && folderLinkInput) {
        loadFolderBtn.addEventListener('click', () => {
            const url = folderLinkInput.value.trim();
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            const folderId = folderIdMatch ? folderIdMatch[1] : (url.length > 20 ? url : null);
            if (folderId) loadPhotos(folderId);
            else showToast('Invalid folder link!', 'error');
        });
    }

    initSelection();
});
