// Photo Selection Logic - Google Drive Integration (Serverless via Google Apps Script)
document.addEventListener('DOMContentLoaded', () => {
    // 🔗 GOOGLE APPS SCRIPT URL - PROVIDED BY USER
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztQv0BxL_2BxvAKG12YVwrt8w0v4fWj6B9381MtJOKS9pL2RvPNdQIavjNXggWHuz5KA/exec";
    
    // UI Elements
    const authContainer = document.getElementById('selection-auth-container');
    const studioDashboard = document.getElementById('studio-dashboard');
    const mainContainer = document.getElementById('selection-main-container');
    const logoutBtn = document.getElementById('logout-btn');
    const selectionGrid = document.getElementById('selection-grid');
    const selectionFooter = document.getElementById('selection-footer');
    const selectedCount = document.getElementById('selected-count');
    const submitBtn = document.getElementById('submit-selection');
    const folderLinkInput = document.getElementById('folder-link-input');
    const loadFolderBtn = document.getElementById('btn-load-folder');

    let selectedPhotos = new Set(); // Stores file IDs
    let currentFolderId = ''; // Stores the ID of the folder currently being viewed
    let clientName = 'Guest';
    let isGuestMode = true; // Default to guest mode for GitHub Pages

    // 1. Initial State Check
    async function initSelection() {
        const urlParams = new URLSearchParams(window.location.search);
        const folderIdParam = urlParams.get('folderId');
        const clientNameParam = urlParams.get('client');

        if (folderIdParam) {
            // Guest Mode with Folder ID
            showSelectionView(false);
            if (clientNameParam) {
                clientName = clientNameParam;
                updateClientHeader();
                loadPhotos(folderIdParam);
            } else {
                document.getElementById('guest-modal').style.display = 'flex';
            }
        } else {
            // Admin Mode or Start Screen
            showAuth();
        }
    }

    function updateClientHeader() {
        if (document.getElementById('display-client-name')) {
            document.getElementById('display-client-name').textContent = clientName;
        }
        if (document.getElementById('guest-welcome')) {
            document.getElementById('guest-welcome').style.display = 'block';
        }
    }

    // Modal Listener
    document.getElementById('btn-start-selection')?.addEventListener('click', () => {
        const nameInput = document.getElementById('guest-name-input');
        if (nameInput && nameInput.value.trim()) {
            clientName = nameInput.value.trim();
            document.getElementById('guest-modal').style.display = 'none';
            updateClientHeader();
            
            const urlParams = new URLSearchParams(window.location.search);
            const folderIdParam = urlParams.get('folderId');
            if (folderIdParam) loadPhotos(folderIdParam);
        } else {
            alert('Please enter your name to continue.');
        }
    });

    // Copy Link Listener
    document.getElementById('btn-copy-link')?.addEventListener('click', () => {
        let folderIdToShare = currentFolderId;
        
        if (!folderIdToShare && folderLinkInput) {
            const url = folderLinkInput.value.trim();
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            if (folderIdMatch && folderIdMatch[1]) {
                folderIdToShare = folderIdMatch[1];
            } else if (url.length > 20 && !url.includes('/')) {
                folderIdToShare = url;
            }
        }

        if (!folderIdToShare) {
            alert('Please paste a Google Drive folder link or load a folder first to copy its sharing link.');
            return;
        }
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?folderId=${folderIdToShare}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Sharing link copied to clipboard! You can now send this to your customer.');
        }).catch(err => {
            prompt('Copy this sharing link:', shareUrl);
        });
    });

    // 2. UI Navigation Logic
    function showAuth() {
        if (!authContainer) return;
        authContainer.style.display = 'block';
        if (studioDashboard) studioDashboard.style.display = 'none';
        mainContainer.style.display = 'none';
        
        const setupBtn = document.getElementById('google-login-btn');
        if (setupBtn) {
            setupBtn.innerHTML = `
                <button id="admin-setup-portal" class="btn-primary" style="margin-top: 10px;">
                    <i class="fas fa-tools"></i> Open Admin Dashboard
                </button>
            `;
            document.getElementById('admin-setup-portal').onclick = () => {
                showSelectionView(true);
            };
        }
    }

    async function showSelectionView(isAdmin = false) {
        if (authContainer) authContainer.style.display = 'none';
        if (studioDashboard) studioDashboard.style.display = 'none';
        mainContainer.style.display = 'block';
        
        if (isAdmin) {
            document.getElementById('admin-tools').style.display = 'block';
            document.getElementById('admin-input-container').style.display = 'flex';
            document.getElementById('persistent-token-status').innerHTML = '<span style="color: #2ecc71; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Serverless Portal Active</span>';
        } else {
            document.getElementById('admin-tools').style.display = 'none';
            document.getElementById('admin-input-container').style.display = 'none';
        }
        
        selectionGrid.innerHTML = '<p style="text-align:center; padding: 40px; color:rgba(255,255,255,0.5);">Please paste a Google Drive folder link above to load photos.</p>';
        selectionFooter.style.display = 'none';
    }

    let allPhotos = []; 
    let currentPhotoIndex = -1;

    // 3. Drive API Calls (via Google Apps Script URL)
    async function loadPhotos(folderId) {
        if (!folderId) return;
        currentFolderId = folderId;
        
        selectionGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading Photos from Google Drive...</div>';
        selectionFooter.style.display = 'none';
        selectedPhotos.clear();
        updateSelectedCount();

        try {
            const fetchUrl = `${SCRIPT_URL}?action=fetch&folderId=${folderId}`;
            console.log("Fetching from GAS:", fetchUrl);
            
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            selectionGrid.innerHTML = '';
            allPhotos = data.photos || []; 
            
            if (allPhotos.length > 0) {
                allPhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'selection-item';
                    photoDiv.innerHTML = `
                        <div class="preview-icon" title="Preview Full Screen">
                            <i class="fas fa-expand"></i>
                        </div>
                        <img src="${photo.thumbnail}" alt="${photo.name}" loading="lazy" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                        <div class="selection-overlay">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    `;
                    
                    photoDiv.addEventListener('click', (e) => {
                        if (e.target.closest('.preview-icon')) return;
                        photoDiv.classList.toggle('selected');
                        if (photoDiv.classList.contains('selected')) {
                            selectedPhotos.add(photo.id);
                        } else {
                            selectedPhotos.delete(photo.id);
                        }
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
                selectionGrid.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No photos found. Ensure the folder is shared as "Anyone with the link can view".</p>';
            }
        } catch (err) {
            console.error("Load Error:", err);
            selectionGrid.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center; width: 100%;"><i class="fas fa-exclamation-triangle"></i> Error: ${err.message}</div>`;
        }
    }

    // 4. Lightbox Logic
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    let currentZoom = 1, translateX = 0, translateY = 0, isDragging = false, startX, startY;

    function openLightbox(index) {
        if (index < 0 || index >= allPhotos.length) return;
        currentPhotoIndex = index;
        const photo = allPhotos[index];
        
        currentZoom = 1; translateX = 0; translateY = 0;
        applyTransform();
        
        lightboxImg.src = photo.thumbnail;
        lightboxCaption.textContent = 'Loading ' + photo.name + '...';
        
        const highResUrl = photo.thumbnail.replace('=s400', '=s1600').replace('=s220', '=s1600');
        const tempImg = new Image();
        tempImg.src = highResUrl;
        tempImg.onload = () => {
            lightboxImg.src = highResUrl;
            lightboxCaption.textContent = photo.name;
        };

        lightboxModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        updateLightboxSelectBtn();
    }

    function applyTransform() {
        if (lightboxImg) lightboxImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
    }

    function closeLightbox() {
        lightboxModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function showPrev() { if (currentPhotoIndex > 0) openLightbox(currentPhotoIndex - 1); }
    function showNext() { if (currentPhotoIndex < allPhotos.length - 1) openLightbox(currentPhotoIndex + 1); }

    function updateLightboxSelectBtn() {
        if (currentPhotoIndex === -1) return;
        const selectBtn = document.getElementById('lightbox-select');
        const isSelected = selectedPhotos.has(allPhotos[currentPhotoIndex].id);
        selectBtn.classList.toggle('selected', isSelected);
        selectBtn.title = isSelected ? 'Deselect Photo / हटाउनुहोस्' : 'Select Photo / रोज्नुहोस्';
    }

    function toggleLightboxSelection() {
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
    }

    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', showPrev);
    document.getElementById('lightbox-next')?.addEventListener('click', showNext);
    document.getElementById('lightbox-select')?.addEventListener('click', toggleLightboxSelection);
    document.getElementById('lightbox-zoom-in')?.addEventListener('click', () => { currentZoom += 0.2; applyTransform(); });
    document.getElementById('lightbox-zoom-out')?.addEventListener('click', () => { if (currentZoom > 1) currentZoom -= 0.2; applyTransform(); });

    function updateSelectedCount() {
        selectedCount.textContent = selectedPhotos.size;
    }

    // 5. Submit Selection (Using Google Apps Script POST)
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (selectedPhotos.size === 0) {
                alert('Please select at least one photo.');
                return;
            }

            const confirmMsg = confirm(`Add ${selectedPhotos.size} photos to your selection folder?`);
            if (!confirmMsg) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            let successCount = 0;
            const selectedFilesArray = Array.from(selectedPhotos);
            
            for (const fileId of selectedFilesArray) {
                try {
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            action: 'addSelection',
                            fileId: fileId,
                            parentFolderId: currentFolderId,
                            customerName: clientName
                        })
                    });
                    successCount++;
                } catch (err) {
                    console.error("Save error:", err);
                }
            }

            const waMessage = encodeURIComponent(`नमस्ते! मेरो फोटो सेलेक्सन पूर्ण भयो।\nनाम: ${clientName}\nजम्मा फोटो: ${successCount}\nकृपया चेक गर्नुहोला।`);
            const waUrl = `https://wa.me/9779852688256?text=${waMessage}`;
            
            alert(`Selection Complete! ${successCount} photos processed.`);
            window.open(waUrl, '_blank');
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirm & Send Selection';
            
            if (successCount > 0) {
                selectedPhotos.clear();
                updateSelectedCount();
                document.querySelectorAll('.selection-item.selected').forEach(el => el.classList.remove('selected'));
            }
        });
    }

    if (loadFolderBtn && folderLinkInput) {
        loadFolderBtn.addEventListener('click', () => {
            const url = folderLinkInput.value.trim();
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            const folderId = folderIdMatch ? folderIdMatch[1] : (url.length > 20 ? url : null);
            
            if (folderId) loadPhotos(folderId);
            else alert('Please enter a valid Google Drive folder link.');
        });
    }

    initSelection();
});
