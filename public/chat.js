// Chat functionality and Socket.IO handling

// Get room code from URL
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

if (!roomCode) {
    window.location.href = '/';
}

// DOM elements
const roomNameElement = document.getElementById('roomName');
const roomCodeElement = document.getElementById('roomCode');
const roomExpiryElement = document.getElementById('roomExpiry');
const messagesContainer = document.getElementById('messagesContainer');
const messagesList = document.getElementById('messagesList');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const copyRoomLinkButton = document.getElementById('copyRoomLink');
const leaveRoomButton = document.getElementById('leaveRoom');
const connectionStatus = document.getElementById('connectionStatus');
const statusIndicator = connectionStatus.querySelector('.status-indicator');
const statusText = connectionStatus.querySelector('.status-text');
const expiredModal = document.getElementById('expiredModal');
const goHomeButton = document.getElementById('goHome');
const toastContainer = document.getElementById('toastContainer');

// Socket.IO connection
const socket = io();
let currentRoom = null;
let isConnected = false;
let expiryTimer = null;
let currentUsername = null; // Store current user's username

// Utility functions
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatExpiry(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) {
        return 'Expired';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
}

function updateConnectionStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMessage(messageData, isSystemMessage = false) {
    const messageElement = document.createElement('div');
    
    if (isSystemMessage) {
        messageElement.className = 'system-message';
        messageElement.textContent = messageData.message || messageData;
    } else {
        // Determine if this message is from the current user
        const isOwnMessage = currentUsername && messageData.username === currentUsername;
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const username = document.createElement('span');
        username.className = 'message-username';
        username.textContent = messageData.username;
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTime(messageData.createdAt);
        
        messageHeader.appendChild(username);
        messageHeader.appendChild(time);
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = messageData.content;
        
        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageContent);
    }
    
    messagesList.appendChild(messageElement);
    scrollToBottom();
}

async function loadMessages() {
    try {
        const response = await fetch(`/api/rooms/${roomCode}/messages`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load messages');
        }
        
        // Clear existing messages
        messagesList.innerHTML = '';
        
        // Add all messages
        data.messages.forEach(message => {
            addMessage(message);
        });
        
        scrollToBottom();
    } catch (error) {
        console.error('Failed to load messages:', error);
        showToast('Failed to load previous messages', 'error');
    }
}

function updateRoomExpiry() {
    if (currentRoom && currentRoom.expiresAt) {
        const expiryText = formatExpiry(currentRoom.expiresAt);
        roomExpiryElement.textContent = `Expires in: ${expiryText}`;
        
        const now = new Date();
        const expiry = new Date(currentRoom.expiresAt);
        const diff = expiry - now;
        
        if (diff <= 0) {
            roomExpiryElement.textContent = 'Expired';
            if (expiryTimer) {
                clearInterval(expiryTimer);
                expiryTimer = null;
            }
        }
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get user info');
        }
        
        currentUsername = data.user.username;
        console.log('Current user:', currentUsername);
    } catch (error) {
        console.error('Failed to get current user:', error);
        showToast('Failed to get user info', 'error');
    }
}

// Socket event handlers
socket.on('connect', async () => {
    console.log('Connected to server');
    isConnected = true;
    updateConnectionStatus('connected', 'Connected');
    
    // Get current user info
    await getCurrentUser();
    
    // Join the room
    socket.emit('join-room', roomCode);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    isConnected = false;
    updateConnectionStatus('connecting', 'Disconnected');
});

socket.on('room-joined', (data) => {
    console.log('Joined room:', data);
    currentRoom = data;
    
    roomNameElement.textContent = data.roomName;
    roomCodeElement.textContent = `Room Code: ${data.roomCode}`;
    
    // Load existing messages
    loadMessages();
    
    // Start expiry timer
    updateRoomExpiry();
    expiryTimer = setInterval(updateRoomExpiry, 1000);
    
    showToast(`Joined room "${data.roomName}"`);
});

socket.on('new-message', (messageData) => {
    console.log('New message:', messageData);
    addMessage(messageData);
});

socket.on('user-joined', (data) => {
    console.log('User joined:', data);
    addMessage(data, true);
});

socket.on('user-left', (data) => {
    console.log('User left:', data);
    addMessage(data, true);
});

socket.on('room-expired', (data) => {
    console.log('Room expired:', data);
    expiredModal.style.display = 'flex';
    
    if (expiryTimer) {
        clearInterval(expiryTimer);
        expiryTimer = null;
    }
    
    showToast('Room has expired', 'error');
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    showToast(error, 'error');
    
    if (error.includes('expired') || error.includes('not found')) {
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('connecting', 'Connection failed');
    
    if (error.message === 'Authentication error') {
        showToast('Authentication failed. Please log in again.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
});

// Message form handler
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    if (!isConnected) {
        showToast('Not connected to server', 'error');
        return;
    }
    
    // Send message
    socket.emit('send-message', { message });
    
    // Clear input
    messageInput.value = '';
});

// Copy room link handler
copyRoomLinkButton.addEventListener('click', async () => {
    try {
        const roomLink = `${window.location.origin}/?room=${roomCode}`;
        await navigator.clipboard.writeText(roomLink);
        showToast('Room link copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy room link:', error);
        showToast('Failed to copy room link', 'error');
    }
});

// Leave room handler
leaveRoomButton.addEventListener('click', () => {
    const confirmLeave = confirm('Are you sure you want to leave this room?');
    if (confirmLeave) {
        window.location.href = '/';
    }
});

// Go home from expired modal
goHomeButton.addEventListener('click', () => {
    window.location.href = '/';
});

// Auto-resize message input
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Focus message input on page load
document.addEventListener('DOMContentLoaded', () => {
    messageInput.focus();
});

// Handle page visibility change to reconnect if needed
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !socket.connected) {
        console.log('Page became visible, attempting to reconnect...');
        socket.connect();
    }
});

// Handle beforeunload to disconnect gracefully
window.addEventListener('beforeunload', () => {
    if (socket.connected) {
        socket.disconnect();
    }
    
    if (expiryTimer) {
        clearInterval(expiryTimer);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        messageForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape to focus message input
    if (e.key === 'Escape') {
        messageInput.focus();
    }
});

// Auto-scroll when new messages arrive
const observer = new MutationObserver(() => {
    const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10;
    if (isAtBottom) {
        scrollToBottom();
    }
});

observer.observe(messagesList, { childList: true });