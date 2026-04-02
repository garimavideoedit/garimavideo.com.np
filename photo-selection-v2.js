// Photo Selection Logic - Google Drive Integration (Serverless JSONP via Google Apps Script)
document.addEventListener('DOMContentLoaded', () => {
    // 🔗 FINAL JSONP GOOGLE APPS SCRIPT URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7baO73xEg9wHfxlbEo9aTOw7ZS5PxmMYsfrJ9ZaB56tGFy8esgAtlr-uWUB9hbHevRA/exec";
    
    // UI Elements
    const authContainer = document.getElementById('selection-auth-container');
    const studioDashboard = document.getElementById('studio-dashboard');
    const mainContainer = document.getElementById('selection-main-container');
    const contentContainer = document.getElementById('selection-content-container');
    const selectionGrid = document.getElementById('selection-grid');
    const selectionFooter = document.getElementById('selection-footer');
    const selectedCount = document.getElementById('selected-count');
    const submitBtn = document.getElementById('submit-selection');
    const folderLinkInput = document.getElementById('folder-link-input');
    const loadFolderBtn = document.getElementById('btn-load-folder');
    const tabGallery = document.getElementById('tab-gallery');
    const tabSelection = document.getElementById('tab-selection');

    let selectedPhotos = new Set(); 
    let currentFolderId = ''; 
    let photoCache = {}; 
    let selectedCache = {}; 
    
    // --- Persistent Cache Helpers ---
    function saveLocalCache() {
        try {
            localStorage.setItem('photo_gallery_cache', JSON.stringify(photoCache));
            localStorage.setItem('photo_selection_cache', JSON.stringify(selectedCache));
            localStorage.setItem('photo_cache_time', Date.now());
        } catch (e) {
            console.warn("Storage full, could not save cache.");
        }
    }

    function loadLocalCache() {
        const cacheTime = localStorage.getItem('photo_cache_time');
        if (cacheTime && (Date.now() - cacheTime < 86400000)) { // 24h limit
            try {
                photoCache = JSON.parse(localStorage.getItem('photo_gallery_cache')) || {};
                selectedCache = JSON.parse(localStorage.getItem('photo_selection_cache')) || {};
            } catch (e) { console.error("Cache parse error"); }
        }
    }
    loadLocalCache();

    let clientName = localStorage.getItem('photo_client_name') || '';

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

        // Priority 1: URL Parameter
        if (clientNameParam) {
            clientName = clientNameParam;
            localStorage.setItem('photo_client_name', clientName);
        }

        if (folderIdParam) {
            currentFolderId = folderIdParam;
            showSelectionView(false);
            
            // Check if we already have a valid client name from URL or LocalStorage
            if (clientName && clientName.trim() !== '' && clientName !== 'Guest') {
                const lastTab = localStorage.getItem('photo_active_tab') || 'gallery';
                if (lastTab === 'selection') {
                    // Force a slight delay to ensure UI is ready
                    setTimeout(() => tabSelection?.click(), 100);
                } else {
                    setTimeout(() => tabGallery?.click(), 100);
                }
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
            localStorage.setItem('photo_client_name', clientName);
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
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
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
        if (contentContainer) contentContainer.style.display = 'block';
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
        if (contentContainer) contentContainer.style.display = 'block';
        
        // 🚀 Caching: If we already have photos, show them instantly!
        if (photoCache[folderId]) {
            renderPhotos(photoCache[folderId]);
            // Still fetch in background for any changes, but silently
            fetchPhotosBackground(folderId);
        } else {
            selectionGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading Photos from Google Drive...</div>';
            selectionFooter.style.display = 'none';
            selectedPhotos.clear();
            updateSelectedCount();
            await fetchPhotosBackground(folderId);
        }
    }

    async function fetchPhotosBackground(folderId) {
        try {
            // Update URL so refresh keeps the same view
            const newUrl = `${window.location.origin}${window.location.pathname}?folderId=${folderId}`;
            window.history.replaceState({ path: newUrl }, '', newUrl);

            const data = await callGAS({ action: 'fetch', folderId: folderId });
            if (data.error) throw new Error(data.error);

            photoCache[folderId] = data.photos || [];
            saveLocalCache(); // 🚀 Persist to LocalStorage
            renderPhotos(photoCache[folderId]);
        } catch (err) {
            console.error(err);
            if (!photoCache[folderId]) {
                selectionGrid.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center; width: 100%;">Error: ${err.message}</div>`;
            } else {
                showToast(`Update Error: ${err.message}`, 'error');
            }
        }
    }

    function renderPhotos(photos) {
        if (!tabGallery || !tabGallery.classList.contains('active')) return;
        selectionGrid.innerHTML = '';
        allPhotos = photos; 
        
        if (allPhotos.length > 0) {
            allPhotos.forEach((photo, index) => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'selection-item';
                // Check if already selected (maintain state across tab switches)
                if (selectedPhotos.has(photo.id)) photoDiv.classList.add('selected');
                
                photoDiv.innerHTML = `
                    <div class="selection-badge ${selectedPhotos.has(photo.id) ? 'selected' : ''}" title="Select / फोटो रोज्नुहोस्">
                        <i class="fas fa-heart"></i>
                    </div>
                    <img src="${photo.thumbnail}" alt="${photo.name}" loading="lazy" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                    <div class="selection-overlay"></div>
                `;

                // Handle Selection (Heart Badge Click) - OPTIMISTIC UI
                photoDiv.querySelector('.selection-badge').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const badge = e.currentTarget;
                    if (badge.classList.contains('saving')) return; // Prevent spamming

                    const isSelecting = !selectedPhotos.has(photo.id);
                    
                    // --- OPTIMISTIC UI UPDATE ---
                    badge.classList.add('saving');
                    if (isSelecting) {
                        selectedPhotos.add(photo.id);
                        photoDiv.classList.add('selected');
                        badge.classList.add('selected');
                    } else {
                        selectedPhotos.delete(photo.id);
                        photoDiv.classList.remove('selected');
                        badge.classList.remove('selected');
                    }
                    updateSelectedCount();

                    try {
                        let res;
                        if (isSelecting) {
                            res = await callGAS({
                                action: 'batchAddSelection',
                                fileIds: photo.id,
                                parentFolderId: currentFolderId,
                                customerName: clientName
                            });
                        } else {
                            res = await callGAS({
                                action: 'removeSelection',
                                fileId: photo.id,
                                parentFolderId: currentFolderId,
                                customerName: clientName
                            });
                        }

                        if (res.success) {
                            showToast(isSelecting ? 'Photo saved.' : 'Photo removed.');
                            // Clear cache to force a fresh fetch in the selection tab
                            delete selectedCache[currentFolderId];
                            saveLocalCache();
                        } else {
                            throw new Error(res.error || 'Server error.');
                        }
                    } catch (err) {
                        // --- REVERT ON FAILURE ---
                        if (isSelecting) {
                            selectedPhotos.delete(photo.id);
                            photoDiv.classList.remove('selected');
                            badge.classList.remove('selected');
                        } else {
                            selectedPhotos.add(photo.id);
                            photoDiv.classList.add('selected');
                            badge.classList.add('selected');
                        }
                        updateSelectedCount();
                        showToast(`Failed: ${err.message}`, 'error');
                    } finally {
                        badge.classList.remove('saving');
                    }
                });

                // Handle Preview (Whole Card Click)
                photoDiv.addEventListener('click', (e) => {
                    if (e.target.closest('.selection-badge')) return;
                    openLightbox(index);
                });

                selectionGrid.appendChild(photoDiv);
            });
            selectionFooter.style.display = 'flex';
        } else {
            selectionGrid.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No photos found in this folder.</p>';
        }
    }

    async function loadSelection() {
        if (!currentFolderId) return;
        
        // 🚀 Caching: If we already have selection, show it instantly!
        if (selectedCache[currentFolderId]) {
            renderSelection(selectedCache[currentFolderId]);
            // Still fetch in background for any changes, but silently
            fetchSelectionBackground(currentFolderId);
        } else {
            selectionGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading Your Selection...</div>';
            selectionFooter.style.display = 'none';
            await fetchSelectionBackground(currentFolderId);
        }
    }

    async function fetchSelectionBackground(folderId) {
        try {
            const data = await callGAS({ 
                action: 'fetchSelection', 
                parentFolderId: folderId, 
                customerName: clientName 
            });
            
            if (data.error) throw new Error(data.error);

            selectedCache[folderId] = data.photos || [];
            saveLocalCache(); // 🚀 Persist to LocalStorage
            renderSelection(selectedCache[folderId]);
        } catch (err) {
            console.error(err);
            if (!selectedCache[folderId]) {
                selectionGrid.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center; width: 100%;">Error: ${err.message}</div>`;
            } else {
                showToast(`Update Error: ${err.message}`, 'error');
            }
        }
    }

    function renderSelection(selectedItems) {
        if (!tabSelection || !tabSelection.classList.contains('active')) return;
        selectionGrid.innerHTML = '';
        if (selectedItems.length > 0) {
            selectedItems.forEach((photo, index) => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'selection-item selected-view-only';
                photoDiv.innerHTML = `
                    <div class="quick-remove" title="Remove from Selection"><i class="fas fa-trash-alt"></i></div>
                    <div class="preview-icon"><i class="fas fa-expand"></i></div>
                    <img src="${photo.thumbnail}" alt="${photo.name}" loading="lazy">
                `;
                
                // Entire Card Click for Preview (except remove button)
                photoDiv.addEventListener('click', (e) => {
                    if (e.target.closest('.quick-remove')) {
                        e.stopPropagation();
                        confirmAndRemove(photo);
                        return;
                    }
                    openLightboxForSelection(selectedItems, index);
                });

            selectionGrid.appendChild(photoDiv);
            });
            // Update selectedPhotos Set with IDs from the server to keep states in sync across Gallery/Selection
            selectedItems.forEach(p => selectedPhotos.add(p.id));
            updateSelectedCount();
        } else {
            selectionGrid.innerHTML = '<p style="color: white; text-align: center; width: 100%; padding: 40px; opacity: 0.6;">You haven\'t selected any photos yet.</p>';
        }
    }

    async function confirmAndRemove(photo) {
        const confirmed = await showConfirm('Remove Photo?', `तपाईं यो फोटोलाई सेलेक्सनबाट हटाउन चाहनुहुन्छ? यो फेरि 'Gallery' मा जानेछ।`);
        if (!confirmed) return;

        try {
            const res = await callGAS({
                action: 'removeSelection',
                fileId: photo.id,
                parentFolderId: currentFolderId,
                customerName: clientName
            });

            if (res.success) {
                showToast('Photo removed from selection.');
                // Optimistically remove from local state but keep current cache for instant UI
                if (selectedCache[currentFolderId]) {
                    selectedCache[currentFolderId] = selectedCache[currentFolderId].filter(p => p.id !== photo.id);
                    saveLocalCache();
                }
                loadSelection(); // Refresh list
            } else {
                throw new Error(res.error || 'Failed to remove photo.');
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    // Lightbox for selection view (simpler)
    function openLightboxForSelection(photos, index) {
        allPhotos = photos; // Temporarily swap gallery for selection
        openLightbox(index);
        
        // Mode: Selection Review
        if (selectBtn) selectBtn.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'flex';
    }

    // Lightbox Logic
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const selectBtn = document.getElementById('lightbox-select');
    const removeBtn = document.getElementById('lightbox-remove');
    const zoomInBtn = document.getElementById('lightbox-zoom-in');
    const zoomOutBtn = document.getElementById('lightbox-zoom-out');
    
    let currentZoom = 1;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;

    function openLightbox(index) {
        if (index < 0 || index >= allPhotos.length) return;
        currentPhotoIndex = index;
        const photo = allPhotos[index];
        
        // Reset Zoom & Pan
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        
        if (lightboxImg) {
            lightboxImg.style.transform = `scale(1) translate(0,0)`;
            lightboxImg.src = photo.thumbnail.replace('=s400', '=s1600');
            lightboxCaption.textContent = photo.name;
        }
        
        // Mode Check: Default to Gallery Mode
        if (removeBtn && removeBtn.style.display !== 'flex') {
            if (selectBtn) selectBtn.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'none';
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
        const isSelected = selectedPhotos.has(allPhotos[currentPhotoIndex].id);
        if (selectBtn) selectBtn.classList.toggle('selected', isSelected);
    }

    // Zoom Controls
    zoomInBtn?.addEventListener('click', () => {
        if (currentZoom < 3) {
            currentZoom += 0.4;
            updateLightboxTransform();
        }
    });

    zoomOutBtn?.addEventListener('click', () => {
        if (currentZoom > 1) {
            currentZoom -= 0.4;
            if (currentZoom < 1) {
                currentZoom = 1;
                translateX = 0;
                translateY = 0;
            }
            updateLightboxTransform();
        }
    });

    function updateLightboxTransform() {
        if (lightboxImg) {
            lightboxImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
            lightboxImg.style.cursor = currentZoom > 1 ? 'grab' : 'default';
        }
    }

    // Panning/Dragging Logic
    lightboxImg?.addEventListener('mousedown', (e) => {
        if (currentZoom <= 1) return;
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        lightboxImg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateLightboxTransform();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        if (lightboxImg) lightboxImg.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    });

    // Touch support for mobile panning
    lightboxImg?.addEventListener('touchstart', (e) => {
        if (currentZoom <= 1) return;
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    });

    lightboxImg?.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateLightboxTransform();
    });

    lightboxImg?.addEventListener('touchend', () => { isDragging = false; });

    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', () => openLightbox(currentPhotoIndex - 1));
    document.getElementById('lightbox-next')?.addEventListener('click', () => openLightbox(currentPhotoIndex + 1));
    
    document.getElementById('lightbox-select')?.addEventListener('click', async () => {
        const photo = allPhotos[currentPhotoIndex];
        const gridItems = selectionGrid.querySelectorAll('.selection-item');
        const gridItem = gridItems[currentPhotoIndex];
        const badge = gridItem?.querySelector('.selection-badge');
        const selectBtn = document.getElementById('lightbox-select');
        
        if (selectBtn.disabled) return;

        const isSelecting = !selectedPhotos.has(photo.id);
        const originalHTML = selectBtn.innerHTML;
        
        // --- OPTIMISTIC UI UPDATE ---
        if (isSelecting) {
            selectedPhotos.add(photo.id);
            gridItem?.classList.add('selected');
            badge?.classList.add('selected');
        } else {
            selectedPhotos.delete(photo.id);
            gridItem?.classList.remove('selected');
            badge?.classList.remove('selected');
        }
        updateSelectedCount();
        updateLightboxSelectBtn();

        // Start server update
        selectBtn.disabled = true;
        selectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            let res;
            if (isSelecting) {
                res = await callGAS({
                    action: 'batchAddSelection',
                    fileIds: photo.id,
                    parentFolderId: currentFolderId,
                    customerName: clientName
                });
            } else {
                res = await callGAS({
                    action: 'removeSelection',
                    fileId: photo.id,
                    parentFolderId: currentFolderId,
                    customerName: clientName
                });
            }

            if (res.success) {
                showToast(isSelecting ? 'Photo saved.' : 'Photo removed.');
                // Clear cache to force a fresh fetch in the selection tab
                delete selectedCache[currentFolderId];
                saveLocalCache();
            } else {
                throw new Error(res.error || 'Server error.');
            }
        } catch (err) {
            // --- REVERT ON FAILURE ---
            if (isSelecting) {
                selectedPhotos.delete(photo.id);
                gridItem?.classList.remove('selected');
                badge?.classList.remove('selected');
            } else {
                selectedPhotos.add(photo.id);
                gridItem?.classList.add('selected');
                badge?.classList.add('selected');
            }
            updateSelectedCount();
            updateLightboxSelectBtn();
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            selectBtn.disabled = false;
            selectBtn.innerHTML = originalHTML;
        }
    });

    // --- REMOVE FROM SELECTION LOGIC ---
    document.getElementById('lightbox-remove')?.addEventListener('click', async () => {
        const photo = allPhotos[currentPhotoIndex];
        
        const confirmed = await showConfirm('Remove Photo?', `तपाईं यो फोटोलाई सेलेक्सनबाट हटाउन चाहनुहुन्छ? यो फेरि 'Gallery' मा जानेछ।`);
        if (!confirmed) return;

        const removeBtn = document.getElementById('lightbox-remove');
        const originalHTML = removeBtn.innerHTML;
        removeBtn.disabled = true;
        removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await callGAS({
                action: 'removeSelection',
                fileId: photo.id,
                parentFolderId: currentFolderId,
                customerName: clientName
            });

            if (res.success) {
                showToast('Photo removed from selection.');
                closeLightbox();
                // Refresh selection view logic
                if (selectedCache[currentFolderId]) {
                    selectedCache[currentFolderId] = selectedCache[currentFolderId].filter(p => p.id !== photo.id);
                    saveLocalCache();
                }
                loadSelection();
            } else {
                throw new Error(res.error || 'Failed to remove photo.');
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            removeBtn.disabled = false;
            removeBtn.innerHTML = originalHTML;
        }
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
                    // Reset cache after final confirm
                    delete selectedCache[currentFolderId];
                    saveLocalCache();
                    
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
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
            const folderId = folderIdMatch ? folderIdMatch[1] : (url.length > 20 ? url : null);
            if (folderId) {
                console.log("Loading folder ID:", folderId);
                loadPhotos(folderId);
            } else {
                showToast('Invalid folder link!', 'error');
            }
        });
    }

    // Tab Listeners
    tabGallery?.addEventListener('click', () => {
        tabGallery.classList.add('active');
        tabSelection.classList.remove('active');
        localStorage.setItem('photo_active_tab', 'gallery');
        document.getElementById('lightbox-select').style.display = 'flex';
        loadPhotos(currentFolderId);
    });

    tabSelection?.addEventListener('click', () => {
        tabSelection.classList.add('active');
        tabGallery.classList.remove('active');
        localStorage.setItem('photo_active_tab', 'selection');
        loadSelection();
    });

    initSelection();
});
