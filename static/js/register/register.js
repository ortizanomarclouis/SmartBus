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

function validatePassword(password) {
    return password.length >= 8;
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    if (!strengthBar) return;

    strengthBar.className = 'password-strength-bar';
    if (password.length === 0) return;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
    } else if (strength === 3) {
        strengthBar.classList.add('strength-medium');
    } else {
        strengthBar.classList.add('strength-strong');
    }
}


document.getElementById('registerForm').addEventListener('submit', function(e) {
    let isValid = true;

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

 
    if (name === '') {
        showError('registerName', 'Full name is required');
        isValid = false;
    } else if (name.length < 3) {
        showError('registerName', 'Name must be at least 3 characters');
        isValid = false;
    } else {
        clearError('registerName');
    }

    if (email === '') {
        showError('registerEmail', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('registerEmail', 'Please enter a valid email');
        isValid = false;
    } else {
        clearError('registerEmail');
    }

   
    if (password === '') {
        showError('registerPassword', 'Password is required');
        isValid = false;
    } else if (!validatePassword(password)) {
        showError('registerPassword', 'Password must be at least 8 characters');
        isValid = false;
    } else {
        clearError('registerPassword');
    }

    
    if (confirmPassword === '') {
        showError('registerConfirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('registerConfirmPassword', 'Passwords do not match');
        isValid = false;
    } else {
        clearError('registerConfirmPassword');
    }

  
    if (!agreeTerms) {
        const termsError = document.getElementById('termsError');
        termsError.textContent = 'You must agree to the terms';
        termsError.classList.add('show');
        isValid = false;
    } else {
        document.getElementById('termsError').classList.remove('show');
    }

   
    if (!isValid) {
        e.preventDefault(); 
    } 
});


document.getElementById('registerEmail').addEventListener('blur', function() {
    if (this.value.trim() && !validateEmail(this.value)) {
        showError('registerEmail', 'Please enter a valid email');
    }
});

document.getElementById('registerPassword').addEventListener('input', function() {
    checkPasswordStrength(this.value);
    if (this.value && !validatePassword(this.value)) {
        showError('registerPassword', 'Password must be at least 8 characters');
    } else if (this.value) {
        clearError('registerPassword');
    }
});

document.getElementById('registerConfirmPassword').addEventListener('input', function() {
    const password = document.getElementById('registerPassword').value;
    if (this.value && this.value !== password) {
        showError('registerConfirmPassword', 'Passwords do not match');
    } else if (this.value) {
        clearError('registerConfirmPassword');
    }
});
