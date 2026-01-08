// Authentication and main page functionality

// DOM elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const roomActions = document.getElementById('roomActions');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Form elements
const loginFormElement = document.getElementById('login');
const registerFormElement = document.getElementById('register');
const createRoomForm = document.getElementById('createRoom');
const joinRoomForm = document.getElementById('joinRoom');
const logoutButton = document.getElementById('logout');

// Utility functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

// Form switching
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    hideMessages();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    hideMessages();
});

// Login form handler
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        const data = await makeRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        showSuccess('Login successful!');
        
        // Show room actions
        setTimeout(() => {
            loginForm.style.display = 'none';
            roomActions.style.display = 'block';
        }, 1000);

    } catch (error) {
        showError(error.message);
    } finally {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
});

// Register form handler
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!username || !email || !password) {
        showError('Please fill in all fields');
        return;
    }

    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating account...';

        const data = await makeRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        showSuccess('Registration successful!');
        
        // Show room actions
        setTimeout(() => {
            registerForm.style.display = 'none';
            roomActions.style.display = 'block';
        }, 1000);

    } catch (error) {
        showError(error.message);
    } finally {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
    }
});

// Create room form handler
createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const roomName = document.getElementById('roomName').value.trim();

    if (!roomName) {
        showError('Please enter a room name');
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';

        const data = await makeRequest('/api/rooms', {
            method: 'POST',
            body: JSON.stringify({ name: roomName })
        });

        showSuccess(`Room "${data.room.name}" created! Code: ${data.room.code}`);
        
        // Redirect to chat
        setTimeout(() => {
            window.location.href = `/chat?room=${data.room.code}`;
        }, 1500);

    } catch (error) {
        showError(error.message);
    } finally {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Create Room';
    }
});

// Join room form handler
joinRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();

    if (!roomCode) {
        showError('Please enter a room code');
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Joining...';

        const data = await makeRequest(`/api/rooms/${roomCode}`);

        showSuccess(`Joining room "${data.room.name}"...`);
        
        // Redirect to chat
        setTimeout(() => {
            window.location.href = `/chat?room=${roomCode}`;
        }, 1000);

    } catch (error) {
        if (error.message.includes('expired')) {
            showError('This room has expired and is no longer available');
        } else if (error.message.includes('not found')) {
            showError('Room not found. Please check the room code');
        } else {
            showError(error.message);
        }
    } finally {
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Join Room';
    }
});

// Logout handler
logoutButton.addEventListener('click', async () => {
    try {
        await makeRequest('/api/logout', { method: 'POST' });
        
        // Reset forms
        loginFormElement.reset();
        registerFormElement.reset();
        createRoomForm.reset();
        joinRoomForm.reset();
        
        // Show login form
        roomActions.style.display = 'none';
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        
        showSuccess('Logged out successfully');
    } catch (error) {
        showError('Logout failed');
    }
});

// Check if user is already logged in when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check URL parameters for room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        // If there's a room code, try to verify it and redirect to chat
        try {
            const data = await makeRequest(`/api/rooms/${roomCode}`);
            // If room is valid, redirect to chat
            window.location.href = `/chat?room=${roomCode}`;
        } catch (error) {
            if (error.message.includes('Authentication required')) {
                // User needs to log in first
                showError('Please log in to join the room');
                document.getElementById('roomCode').value = roomCode;
            } else if (error.message.includes('expired')) {
                showError('This room has expired and is no longer available');
            } else if (error.message.includes('not found')) {
                showError('Room not found. Please check the room code');
            } else {
                showError(error.message);
            }
        }
    }
});

// Auto-uppercase room codes
document.getElementById('roomCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});