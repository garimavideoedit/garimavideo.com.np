import os
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
import json
import requests
import google.auth.transport.requests
from flask import Flask, redirect, url_for, session, request, jsonify, send_from_directory, Response, stream_with_context
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import google.oauth2.credentials

app = Flask(__name__, static_folder='.', static_url_path='')
# Use a fixed key during development to avoid session loss on restart
app.secret_key = 'development_key_change_me_in_production'

# Token storage for persistent owner access
TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'token.json')

def save_credentials(creds):
    with open(TOKEN_FILE, 'w') as f:
        f.write(creds.to_json())

def load_credentials():
    if os.path.exists(TOKEN_FILE):
        try:
            print(f"DEBUG: Loading credentials from {TOKEN_FILE}")
            
            # Use manual parsing as it's more reliable
            with open(TOKEN_FILE, 'r') as f:
                data = json.load(f)
            
            creds = google.oauth2.credentials.Credentials(
                token=data.get('token'),
                refresh_token=data.get('refresh_token'),
                token_uri=data.get('token_uri'),
                client_id=data.get('client_id'),
                client_secret=data.get('client_secret'),
                scopes=data.get('scopes')
            )
            
            # Use a dummy request to check validity and refresh if needed
            request = google.auth.transport.requests.Request()
            
            if creds and not creds.valid:
                if creds.refresh_token:
                    print("DEBUG: Admin token expired or invalid. Attempting to refresh...")
                    creds.refresh(request)
                    save_credentials(creds) # Update the file with the new token
                    print("DEBUG: Admin token refreshed successfully.")
                else:
                    print("DEBUG: Admin token is invalid and no refresh_token is available.")
            
            return creds
                
        except Exception as e:
            print(f"DEBUG: Error loading credentials: {str(e)}")
            session['last_error'] = str(e) # Store error in session for debugging
            return None
    return None

# --- CONFIGURATION (LOADED FROM client_secrets.json) ---
# For security, the real keys are now stored in client_secrets.json 
# which is listed in .gitignore so it never goes to GitHub.
CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_secrets.json')

def get_client_config():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        return None
    with open(CLIENT_SECRETS_FILE, 'r') as f:
        return json.load(f)

# Note: redirect_uri must match exactly what's in Google Cloud Console
REDIRECT_URI = 'http://localhost:5001/callback'
SCOPES = ['https://www.googleapis.com/auth/drive', 
          'https://www.googleapis.com/auth/drive.file', 
          'https://www.googleapis.com/auth/drive.metadata.readonly']

# --- ROUTES ---

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

@app.route('/login')
def login():
    # Regular login for anyone
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = REDIRECT_URI
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')
    session['state'] = state
    session['is_admin'] = False
    session['code_verifier'] = flow.code_verifier
    return redirect(authorization_url)

@app.route('/admin-login')
def admin_login():
    # Special login for owner to save persistent token
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = REDIRECT_URI
    # Force prompt=consent to ensure we get a refresh_token
    authorization_url, state = flow.authorization_url(
        access_type='offline', 
        include_granted_scopes='true',
        prompt='consent'
    )
    session['state'] = state
    session['is_admin'] = True
    session['code_verifier'] = flow.code_verifier
    return redirect(authorization_url)

@app.route('/callback')
def callback():
    state = session.get('state')
    code_verifier = session.get('code_verifier')
    if not state:
        return redirect('/login')
        
    flow = Flow.from_client_config(client_config, scopes=SCOPES, state=state)
    flow.redirect_uri = REDIRECT_URI
    flow.code_verifier = code_verifier # Restore PKCE verifier
    
    authorization_response = request.url
    flow.fetch_token(authorization_response=authorization_response)
    
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    
    # If this was an admin login, save the token persistently
    if session.get('is_admin'):
        save_credentials(credentials)
        print("Admin token saved successfully!")
    
    return redirect('/photo-selection.html')

@app.route('/api/check-auth')
def check_auth():
    # Authenticated if session exists OR if persistent token exists (for guest view)
    is_admin = 'credentials' in session
    has_token = os.path.exists(TOKEN_FILE)
    
    # We return guest_mode=true if they aren't logged in but we have a token
    return jsonify({
        'authenticated': is_admin,
        'has_persistent_token': has_token
    })

@app.route('/api/thumbnail/<file_id>')
def get_thumbnail(file_id):
    creds = None
    if 'credentials' in session:
        creds = google.oauth2.credentials.Credentials(**session['credentials'])
    else:
        creds = load_credentials()
        
    if not (creds and creds.valid):
        return "Unauthorized", 401
    
    # Use the global requests call for efficiency
    try:
        # First get the file metadata to find the thumbnail link
        service = build('drive', 'v3', credentials=creds)
        file_data = service.files().get(fileId=file_id, fields='thumbnailLink').execute()
        thumb_url = file_data.get('thumbnailLink')
        
        if not thumb_url:
            return "No thumbnail available", 404
            
        # Standard sizes are =s220. We can change this based on request
        size = request.args.get('size', '220')
        thumb_url = thumb_url.replace('=s220', f'=s{size}')
        
        headers = {'Authorization': f'Bearer {creds.token}'}
        
        # Stream the response for better performance
        resp = requests.get(thumb_url, headers=headers, stream=True)
        
        def generate():
            for chunk in resp.iter_content(chunk_size=4096):
                yield chunk
                
        return Response(
            stream_with_context(generate()),
            status=resp.status_code,
            content_type=resp.headers.get('Content-Type', 'image/jpeg'),
            headers={'Cache-Control': 'public, max-age=3600'} # Cache for 1 hour
        )
    except Exception as e:
        print(f"Thumbnail Error: {str(e)}")
        return str(e), 500

@app.route('/api/fetch-photos')
def fetch_photos():
    creds = None
    auth_source = "none"
    if 'credentials' in session:
        print("DEBUG: Using session credentials")
        creds = google.oauth2.credentials.Credentials(**session['credentials'])
        auth_source = "session"
    else:
        print("DEBUG: Attempting to load persistent credentials")
        creds = load_credentials()
        auth_source = "persistent_file"
        
    if not creds:
        last_error = session.pop('last_error', 'No file found or parsing failed')
        print(f"DEBUG: No credentials found ({auth_source}): {last_error}")
        return jsonify({'error': f'Not authenticated ({auth_source}): {last_error}'}), 401
    
    if not creds.valid:
        print(f"DEBUG: Credentials found ({auth_source}) but are INVALID")
        return jsonify({'error': f'Invalid credentials (Source: {auth_source})'}), 401
    
    print(f"DEBUG: Credentials valid ({auth_source}), building service...")
    service = build('drive', 'v3', credentials=creds)
    
    folder_id = request.args.get('folderId')
    query = "mimeType contains 'image/' and trashed = false"
    if folder_id:
        query += f" and '{folder_id}' in parents"
        
    try:
        results = service.files().list(
            pageSize=100,
            fields="nextPageToken, files(id, name, thumbnailLink, webViewLink)",
            q=query
        ).execute()
        
        items = results.get('files', [])
        photos = []
        for item in items:
            # USE THE PROXIED THUMBNAIL URL
            proxied_thumb = url_for('get_thumbnail', file_id=item['id'])
            photos.append({
                'id': item['id'],
                'name': item['name'],
                'thumbnail': proxied_thumb,
                'link': item.get('webViewLink')
            })
            
        return jsonify({'photos': photos})
    except Exception as e:
        print(f"DEBUG: Error fetching photos: {str(e)}")
        return jsonify({'error': str(e)}), 500

def _get_or_create_selected_folder(service, parent_id):
    query = f"name = 'Selected Photos' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, fields="files(id)").execute()
    files = results.get('files', [])
    
    if files:
        return files[0]['id']
    else:
        folder_metadata = {
            'name': 'Selected Photos',
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        folder = service.files().create(body=folder_metadata, fields='id').execute()
        return folder.get('id')

@app.route('/api/add-to-folder', methods=['POST'])
def add_to_folder():
    creds = None
    auth_source = "none"
    if 'credentials' in session:
        print("DEBUG (Add): Using session credentials")
        creds = google.oauth2.credentials.Credentials(**session['credentials'])
        auth_source = "session"
    else:
        print("DEBUG (Add): Attempting to load persistent credentials")
        creds = load_credentials()
        auth_source = "persistent_file"
        
    if not (creds and creds.valid):
        last_error = session.pop('last_error', 'Invalid or missing credentials')
        print(f"DEBUG (Add): Auth failed ({auth_source}): {last_error}")
        return jsonify({'error': f'Not authenticated ({auth_source}): {last_error}'}), 401
    
    data = request.get_json()
    file_id = data.get('fileId')
    parent_folder_id = data.get('parentFolderId')
    customer_name = data.get('customerName', 'Guest')
    
    if not file_id or not parent_folder_id:
        return jsonify({'error': 'Missing fileId or parentFolderId'}), 400
        
    service = build('drive', 'v3', credentials=creds)
    
    try:
        print(f"DEBUG (Add): Attempting to create selection folder for {customer_name} in {parent_folder_id}")
        # 1. Get or create the "Selected Photos - [Name]" subfolder
        folder_name = f"Selected Photos - {customer_name}"
        query = f"name = '{folder_name}' and '{parent_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = service.files().list(q=query, fields="files(id)").execute()
        files = results.get('files', [])
        
        target_folder_id = ''
        if files:
            target_folder_id = files[0]['id']
        else:
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_folder_id]
            }
            folder = service.files().create(body=folder_metadata, fields='id').execute()
            target_folder_id = folder.get('id')
        
        # 2. Get original file name
        original_file = service.files().get(fileId=file_id, fields='name').execute()
        original_name = original_file.get('name')

        # 3. Copy file to the Selected Photos folder
        copy_metadata = {
            'name': original_name,
            'parents': [target_folder_id]
        }
        
        file = service.files().copy(fileId=file_id, body=copy_metadata, fields='id').execute()
        print(f"DEBUG (Add): Successfully added file {file_id} ({original_file['name']})")
        return jsonify({'success': True, 'fileId': file_id})
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"DEBUG (Add): Exception occurred: {error_msg}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': error_msg}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/photo-selection.html')

if __name__ == '__main__':
    # Using 5001 to avoid potential conflict with AirPlay on Windows
    app.run(host='0.0.0.0', port=5001, debug=True)
