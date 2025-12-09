// Supabase Configuration
const supabaseUrl = typeof __supabase_url !== 'undefined' ? __supabase_url : 'https://azzhzwknftoymvgrbgzt.supabase.co';
const supabaseAnonKey = typeof __supabase_anon_key !== 'undefined' ? __supabase_anon_key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6emh6d2tuZnRveW12Z3JiZ3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTU5NTQsImV4cCI6MjA3NDc5MTk1NH0.-xV5Mqx87uEibjMSHw0RMF5dZL85aJpJLQ0-h-6cevc';

let supabase;

// Initialize Supabase
async function initSupabase() {
    try {
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Initialize on page load
initSupabase();

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

// Validation Helper Functions
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + 'Error');
    if (input && errorElement) {
        input.classList.add('error');
        input.classList.remove('success');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function showSuccess(inputId, message) {
    const input = document.getElementById(inputId);
    const successElement = document.getElementById(inputId + 'Success');
    if (input && successElement) {
        input.classList.add('success');
        input.classList.remove('error');
        successElement.textContent = message;
        successElement.classList.add('show');
    }
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + 'Error');
    if (input && errorElement) {
        input.classList.remove('error');
        input.classList.add('success');
        errorElement.classList.remove('show');
    }
}

function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.success-message').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
        input.classList.remove('success');
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Login Form Validation
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
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

    if (!isValid) e.preventDefault();
});

// Password Reset Modal Functions
function openPasswordResetModal(e) {
    e.preventDefault();
    const modal = document.getElementById('passwordResetModal');
    if (modal) {
        modal.classList.add('active');
        goToResetStep(1);
    }
}

function closePasswordResetModal() {
    const modal = document.getElementById('passwordResetModal');
    if (modal) {
        modal.classList.remove('active');
        
        // Reset forms
        const resetEmailForm = document.getElementById('resetEmailForm');
        const verifyCodeForm = document.getElementById('verifyCodeForm');
        const newPasswordForm = document.getElementById('newPasswordForm');
        
        if (resetEmailForm) resetEmailForm.reset();
        if (verifyCodeForm) verifyCodeForm.reset();
        if (newPasswordForm) newPasswordForm.reset();
        
        clearAllErrors();
        
        // Reset password strength indicator
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');
        if (strengthBar) {
            strengthBar.className = 'password-strength-fill';
        }
        if (strengthText) {
            strengthText.textContent = '';
        }
    }
}

function goToResetStep(step) {
    document.querySelectorAll('.reset-step').forEach(s => s.style.display = 'none');
    const currentStep = document.getElementById('resetStep' + step);
    if (currentStep) {
        currentStep.style.display = 'block';
    }
}

// Step 1: Send Reset Code via Supabase
async function sendResetCode(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.getElementById('sendCodeBtn');

    if (!validateEmail(email)) {
        showError('resetEmail', 'Please enter a valid email address');
        return;
    }

    if (!supabase) {
        showError('resetEmail', 'Service not ready. Please refresh the page.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
    }

    try {
        // Use Supabase's built-in password reset email
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password/`
        });

        if (error) {
            console.error('Password reset error:', error);
            showError('resetEmail', error.message || 'Failed to send reset email');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Send Reset Code';
            }
            return;
        }

        showSuccess('resetEmail', 'Reset link sent! Check your email.');
        const emailSentTo = document.getElementById('emailSentTo');
        if (emailSentTo) {
            emailSentTo.textContent = `Password reset link sent to ${email}. Please check your email and click the link to reset your password.`;
        }
        
        // Show success message and close modal
        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Send Reset Code';
            }
            alert('Password reset email sent! Please check your inbox and follow the instructions.');
            closePasswordResetModal();
        }, 2000);

    } catch (error) {
        console.error('Unexpected error:', error);
        showError('resetEmail', 'An unexpected error occurred. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send Reset Code';
        }
    }
}

// Step 2: Verify Reset Code (Supabase handles this via email link)
// This function is kept for the UI flow but Supabase uses magic links
async function verifyResetCode(e) {
    e.preventDefault();
    const code = document.getElementById('verificationCode').value.trim();

    if (code.length !== 6) {
        showError('verifyCode', 'Please enter a valid 6-digit code');
        return;
    }

    // Note: Supabase uses magic links, not verification codes
    // If you want to use OTP, you need to implement custom logic
    // For now, we'll proceed to the next step
    goToResetStep(3);
}

// Password Strength Checker
const newPasswordInput = document.getElementById('newPassword');
if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function(e) {
        const password = e.target.value;
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');

        if (!strengthBar || !strengthText) return;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;

        strengthBar.className = 'password-strength-fill';
        
        if (password.length === 0) {
            strengthText.textContent = '';
            strengthBar.style.width = '0%';
        } else if (strength <= 1) {
            strengthBar.classList.add('strength-weak');
            strengthText.textContent = 'Weak password';
            strengthText.style.color = '#ef4444';
        } else if (strength <= 2) {
            strengthBar.classList.add('strength-medium');
            strengthText.textContent = 'Medium password';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.classList.add('strength-strong');
            strengthText.textContent = 'Strong password';
            strengthText.style.color = '#10b981';
        }
    });
}

// Step 3: Reset Password via Supabase
async function resetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    let isValid = true;

    if (newPassword.length < 8) {
        showError('newPassword', 'Password must be at least 8 characters');
        isValid = false;
    } else {
        clearError('newPassword');
    }

    if (newPassword !== confirmPassword) {
        showError('confirmPassword', 'Passwords do not match');
        isValid = false;
    } else {
        clearError('confirmPassword');
    }

    if (!isValid) return;

    if (!supabase) {
        alert('Service not ready. Please refresh the page.');
        return;
    }

    try {
        // Update password using Supabase
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            console.error('Password update error:', error);
            alert('Failed to reset password: ' + error.message);
            return;
        }

        alert('Password reset successful! You can now login with your new password.');
        closePasswordResetModal();

        // Clear the login form password field
        const loginPassword = document.getElementById('loginPassword');
        if (loginPassword) {
            loginPassword.value = '';
        }

    } catch (error) {
        console.error('Unexpected error:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('passwordResetModal');
    if (event.target === modal) {
        closePasswordResetModal();
    }
}

// Helper function to get CSRF token for Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}