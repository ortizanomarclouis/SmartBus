
const users = JSON.parse(localStorage.getItem("users")) || [];


function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}


function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + 'Error');
    input.classList.add('error');
    input.classList.remove('success');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + 'Error');
    input.classList.remove('error');
    input.classList.add('success');
    errorElement.classList.remove('show');
}


function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}


document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let isValid = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (email === '') {
        showError('loginEmail', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('loginEmail', 'Please enter a valid email');
        isValid = false;
    } else {
        clearError('loginEmail');
    }

    if (password === '') {
        showError('loginPassword', 'Password is required');
        isValid = false;
    } else {
        clearError('loginPassword');
    }

    if (isValid) {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            alert(`Welcome back, ${user.name}! 🎉`);
            document.getElementById('loginForm').reset();
        } else {
            showError('loginPassword', 'Invalid email or password');
        }
    }
});
