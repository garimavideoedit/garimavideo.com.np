// Photo Selection Logic - Google Drive Integration
document.addEventListener('DOMContentLoaded', () => {
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
    let isGuestMode = false;

    // 1. Check Authentication Status
    async function checkAuth() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            
            // Check for URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const folderIdParam = urlParams.get('folderId');
            const clientNameParam = urlParams.get('client');

            if (data.authenticated) {
                // Admin is logged in
                showSelectionView(true);
                updatePersistentStatus(data.has_persistent_token);
                
                // Persistence: Check for folderId in URL or sessionStorage
                const savedFolderId = sessionStorage.getItem('lastFolderId');
                
                if (folderIdParam) {
                    loadPhotos(folderIdParam);
                } else if (savedFolderId) {
                    loadPhotos(savedFolderId);
                    if (folderLinkInput) {
                        folderLinkInput.value = `https://drive.google.com/drive/folders/${savedFolderId}`;
                    }
                }
            } else if (data.has_persistent_token && folderIdParam) {
                // Persistent token exists, and we have a folder ID -> Guest Mode
                isGuestMode = true;
                showSelectionView(false);
                
                if (clientNameParam) {
                    clientName = clientNameParam;
                    document.getElementById('display-client-name').textContent = clientName;
                    document.getElementById('guest-welcome').style.display = 'block';
                    loadPhotos(folderIdParam);
                } else {
                    // Show name prompt modal
                    document.getElementById('guest-modal').style.display = 'flex';
                }
            } else {
                showAuth();
            }
        } catch (err) {
            console.error("Error checking auth:", err);
            showAuth();
        }
    }

    // Modal Listener
    document.getElementById('btn-start-selection')?.addEventListener('click', () => {
        const nameInput = document.getElementById('guest-name-input');
        if (nameInput && nameInput.value.trim()) {
            clientName = nameInput.value.trim();
            document.getElementById('guest-modal').style.display = 'none';
            document.getElementById('display-client-name').textContent = clientName;
            document.getElementById('guest-welcome').style.display = 'block';
            
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
        
        // If photos haven't been loaded yet, try to extract ID from the input field
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
            console.error('Could not copy text: ', err);
            prompt('Copy this sharing link:', shareUrl);
        });
    });

    // 2. UI Navigation Logic
    function showAuth() {
        authContainer.style.display = 'block';
        studioDashboard.style.display = 'none';
        mainContainer.style.display = 'none';
    }

    async function showSelectionView(isAdmin = false) {
        authContainer.style.display = 'none';
        studioDashboard.style.display = 'none';
        mainContainer.style.display = 'block';
        
        if (isAdmin) {
            document.getElementById('admin-tools').style.display = 'block';
            document.getElementById('admin-input-container').style.display = 'flex';
        } else {
            document.getElementById('admin-tools').style.display = 'none';
            document.getElementById('admin-input-container').style.display = 'none';
        }
        
        // Don't auto-load photos now, wait for link input
        selectionGrid.innerHTML = '<p style="text-align:center; padding: 40px; color:rgba(255,255,255,0.5);">Please paste a Google Drive folder link above to load photos.</p>';
        selectionFooter.style.display = 'none';
    }

    function updatePersistentStatus(hasToken) {
        const statusDiv = document.getElementById('persistent-token-status');
        if (!statusDiv) return;
        
        if (hasToken) {
            statusDiv.innerHTML = '<span style="color: #2ecc71; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Sharing Access Active</span>';
        } else {
            statusDiv.innerHTML = `
                <a href="/admin-login" class="btn-primary" style="font-size: 0.75rem; padding: 5px 10px; text-decoration: none; margin-top: 5px; display: inline-block;">
                    Authorise Sharing Access
                </a>
                <p style="color: #ff6b6b; font-size: 0.75rem; margin-top: 5px;">Sharing links won't work until you click above!</p>
            `;
        }
    }

    let allPhotos = []; // Keep track of all photos for lightbox navigation
    let currentPhotoIndex = -1;

    // 3. Drive API Calls (via Python API)
    async function loadPhotos(folderId = '') {
        currentFolderId = folderId; // Track current folder
        if (folderId) {
            sessionStorage.setItem('lastFolderId', folderId);
        }
        selectionGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading Photos from Folder...</div>';
        selectionFooter.style.display = 'none';
        selectedPhotos.clear();
        updateSelectedCount();

        try {
            const url = folderId ? `/api/fetch-photos?folderId=${folderId}` : '/api/fetch-photos';
            console.log("Fetching photos from:", url); // Debug log
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server returned ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                if (data.error === 'Not authenticated' || data.error === 'Token expired') {
                    showAuth();
                    return;
                }
                throw new Error(data.error);
            }

            selectionGrid.innerHTML = '';
            allPhotos = data.photos || []; // Store for lightbox
            
            if (allPhotos.length > 0) {
                allPhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'selection-item';
                    photoDiv.innerHTML = `
                        <div class="preview-icon" title="Preview Full Screen">
                            <i class="fas fa-expand"></i>
                        </div>
                        <img src="${photo.thumbnail}" alt="${photo.name}">
                        <div class="selection-overlay">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    `;
                    
                    // Selection Click
                    photoDiv.addEventListener('click', (e) => {
                        // If preview icon specifically clicked, don't toggle selection
                        if (e.target.closest('.preview-icon')) return;
                        
                        photoDiv.classList.toggle('selected');
                        if (photoDiv.classList.contains('selected')) {
                            selectedPhotos.add(photo.id);
                        } else {
                            selectedPhotos.delete(photo.id);
                        }
                        updateSelectedCount();
                    });

                    // Preview Click
                    const previewBtn = photoDiv.querySelector('.preview-icon');
                    previewBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openLightbox(index);
                    });
                    
                    selectionGrid.appendChild(photoDiv);
                });
                selectionFooter.style.display = 'flex';
            } else {
                selectionGrid.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No photos found in this Google Drive folder. Please make sure there are images inside.</p>';
            }
        } catch (err) {
            console.error("Error loading photos:", err);
            selectionGrid.innerHTML = `
                <div style="color: #ff6b6b; padding: 20px; text-align: center; width: 100%;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading photos: ${err.message || 'Unknown error'}
                </div>
            `;
        }
    }

    // 4. Lightbox Logic
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    let currentZoom = 1;

    let translateX = 0, translateY = 0;
    let isDragging = false;
    let startX, startY;

    function openLightbox(index) {
        if (index < 0 || index >= allPhotos.length) return;
        
        currentPhotoIndex = index;
        const photo = allPhotos[index];
        
        currentZoom = 1; // Reset zoom
        translateX = 0;
        translateY = 0;
        applyTransform();
        
        // Clear previous image and show loading state
        lightboxImg.style.opacity = '0.3'; // Show placeholder partially
        lightboxImg.style.filter = 'blur(10px)'; // Blur the placeholder
        lightboxImg.src = photo.thumbnail; // Use existing small thumbnail as placeholder
        
        lightboxCaption.textContent = 'Loading ' + photo.name + '...';
        
        // Use optimized size (1024 is better for performance)
        const highResUrl = photo.thumbnail + (photo.thumbnail.includes('?') ? '&' : '?') + 'size=1024';
        
        // Create a temporary image to load the high-res version
        const tempImg = new Image();
        tempImg.src = highResUrl;
        tempImg.onload = () => {
            lightboxImg.src = highResUrl;
            lightboxImg.style.opacity = '1';
            lightboxImg.style.filter = 'none';
            lightboxCaption.textContent = photo.name;
            // Preload neighbors after current is loaded
            preloadPhotos(index);
        };

        lightboxModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scroll
        updateLightboxSelectBtn();
    }

    // Background preloading for smoother navigation
    function preloadPhotos(index) {
        const neighbors = [index + 1, index - 1, index + 2];
        neighbors.forEach(idx => {
            if (idx >= 0 && idx < allPhotos.length) {
                const img = new Image();
                img.src = allPhotos[idx].thumbnail + '?size=1024';
            }
        });
    }

    function updateLightboxSelectBtn() {
        if (currentPhotoIndex === -1) return;
        const photo = allPhotos[currentPhotoIndex];
        const selectBtn = document.getElementById('lightbox-select');
        if (selectedPhotos.has(photo.id)) {
            selectBtn.classList.add('selected');
            selectBtn.title = 'Deselect Photo / यसलाई आजात गर्नुहोस्'; // Nepali for Deselect (or similar)
        } else {
            selectBtn.classList.remove('selected');
            selectBtn.title = 'Select Photo / फोटो रोज्नुहोस्';
        }
    }

    function toggleLightboxSelection() {
        if (currentPhotoIndex === -1) return;
        const photo = allPhotos[currentPhotoIndex];
        const gridItems = selectionGrid.querySelectorAll('.selection-item');
        const gridItem = gridItems[currentPhotoIndex];
        
        if (selectedPhotos.has(photo.id)) {
            selectedPhotos.delete(photo.id);
            if (gridItem) gridItem.classList.remove('selected');
        } else {
            selectedPhotos.add(photo.id);
            if (gridItem) gridItem.classList.add('selected');
        }
        
        updateSelectedCount();
        updateLightboxSelectBtn();
    }

    function applyTransform() {
        lightboxImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
    }

    function zoomIn() {
        currentZoom += 0.2;
        if (currentZoom > 4) currentZoom = 4;
        applyTransform();
    }

    function zoomOut() {
        currentZoom -= 0.2;
        if (currentZoom < 1) {
            currentZoom = 1;
            translateX = 0;
            translateY = 0;
        }
        applyTransform();
    }

    const zoomInBtn = document.getElementById('lightbox-zoom-in');
    const zoomOutBtn = document.getElementById('lightbox-zoom-out');
    const selectBtn = document.getElementById('lightbox-select');

    if (zoomInBtn) zoomInBtn.onclick = zoomIn;
    if (zoomOutBtn) zoomOutBtn.onclick = zoomOut;
    if (selectBtn) selectBtn.onclick = toggleLightboxSelection;

    // Mouse Wheel Zoom
    lightboxModal.onwheel = (e) => {
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
        e.preventDefault();
    };

    // Drag to Pan
    lightboxImg.onmousedown = (e) => {
        if (currentZoom > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            lightboxImg.style.cursor = 'grabbing';
            e.preventDefault();
        }
    };

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            applyTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        if (lightboxImg) lightboxImg.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    });

    function closeLightbox() {
        lightboxModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function showPrev() {
        console.log("Prev clicked, current index:", currentPhotoIndex);
        if (currentPhotoIndex > 0) {
            openLightbox(currentPhotoIndex - 1);
        }
    }

    function showNext() {
        console.log("Next clicked, current index:", currentPhotoIndex, "Total photos:", allPhotos.length);
        if (currentPhotoIndex < allPhotos.length - 1) {
            openLightbox(currentPhotoIndex + 1);
        }
    }

    // Re-bind buttons to be sure
    function bindLightboxButtons() {
        const lightboxModal = document.getElementById('lightbox-modal');
        const closeBtn = document.querySelector('.lightbox-close');
        const prevBtn = document.getElementById('lightbox-prev');
        const nextBtn = document.getElementById('lightbox-next');
        const zoomInBtn = document.getElementById('lightbox-zoom-in');
        const zoomOutBtn = document.getElementById('lightbox-zoom-out');
        const selectBtn = document.getElementById('lightbox-select');

        if (closeBtn) closeBtn.onclick = closeLightbox;
        if (prevBtn) prevBtn.onclick = showPrev;
        if (nextBtn) nextBtn.onclick = showNext;
        if (zoomInBtn) zoomInBtn.onclick = zoomIn;
        if (zoomOutBtn) zoomOutBtn.onclick = zoomOut;
        if (selectBtn) selectBtn.onclick = toggleLightboxSelection;

        // Close on click outside
        window.onclick = (e) => {
            if (e.target === lightboxModal) closeLightbox();
        };

        // Keyboard navigation
        document.onkeydown = (e) => {
            if (lightboxModal && lightboxModal.style.display === 'block') {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') showPrev();
                if (e.key === 'ArrowRight') showNext();
            }
        };
    }

    bindLightboxButtons();

    function updateSelectedCount() {
        selectedCount.textContent = selectedPhotos.size;
    }

    // 4. Submit Selection (Add Shortcuts via PHP)
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (selectedPhotos.size === 0) {
                alert('Please select at least one photo.');
                return;
            }

            const confirmMsg = confirm(`Are you sure you want to add ${selectedPhotos.size} photos to the selected folder?`);
            if (!confirmMsg) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding to Folder...';

            let successCount = 0;
            let errorCount = 0;

            for (const fileId of selectedPhotos) {
                try {
                    const response = await fetch('/api/add-to-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            fileId: fileId,
                            parentFolderId: currentFolderId,
                            customerName: clientName
                        })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        console.error(`Error adding file ${fileId}:`, result.error);
                        errorCount++;
                    }
                } catch (err) {
                    console.error(`Fetch error for file ${fileId}:`, err);
                    errorCount++;
                }
            }

            alert(`Complete! ${successCount} photos added successfully. ${errorCount > 0 ? errorCount + ' failed.' : ''}`);
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirm & Send Selection';
            
            // Optionally clear selection after success
            if (successCount > 0) {
                selectedPhotos.clear();
                updateSelectedCount();
                document.querySelectorAll('.selection-item.selected').forEach(el => el.classList.remove('selected'));
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Since we use Python sessions, we use /logout
            window.location.href = '/logout';
        });
    }

    // Load Folder Button Listener
    if (loadFolderBtn && folderLinkInput) {
        loadFolderBtn.addEventListener('click', () => {
            const url = folderLinkInput.value.trim();
            if (!url) {
                alert('Please paste a Google Drive folder link.');
                return;
            }

            // Extract Folder ID from URL
            // Format: https://drive.google.com/drive/folders/FOLDER_ID OR .../folders/FOLDER_ID?usp=sharing
            const folderIdMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            if (folderIdMatch && folderIdMatch[1]) {
                const folderId = folderIdMatch[1];
                loadPhotos(folderId);
            } else {
                // Try if they just pasted the ID
                if (url.length > 20 && !url.includes('/')) {
                    loadPhotos(url);
                } else {
                    alert('Invalid folder link format. Please paste a link like: https://drive.google.com/drive/folders/YOUR_FOLDER_ID');
                }
            }
        });
    }

    // Initialize
    checkAuth();
});
