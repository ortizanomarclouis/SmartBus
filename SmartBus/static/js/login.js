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

// submit using POST to Django
document.getElementById('loginForm').addEventListener('submit', function(e) {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let isValid = true;

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

    if (!isValid) e.preventDefault(); // let Django handle POST if valid
});
