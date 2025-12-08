document.addEventListener('DOMContentLoaded', function() {
    const editBtn = document.getElementById('edit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const profileForm = document.getElementById('profile-form');
    const formActions = document.getElementById('form-actions');

    const usernameInput = document.getElementById('username');
    const bioInput = document.getElementById('bio');

    let originalValues = {
        username: usernameInput.value,
        bio: bioInput.value
    };

    // Enable editing
    editBtn.addEventListener('click', function() {
        usernameInput.disabled = false;
        bioInput.disabled = false;

        formActions.style.display = 'flex';
        editBtn.style.opacity = '0.5';
        editBtn.disabled = true;

        usernameInput.focus();
    });

    // Cancel button restores original values
    cancelBtn.addEventListener('click', function() {
        usernameInput.value = originalValues.username;
        bioInput.value = originalValues.bio;

        usernameInput.disabled = true;
        bioInput.disabled = true;

        formActions.style.display = 'none';
        editBtn.style.opacity = '1';
        editBtn.disabled = false;
    });

    // Form submit — allow normal POST to Django
    profileForm.addEventListener('submit', function() {
        usernameInput.disabled = false;
        bioInput.disabled = false;
        editBtn.disabled = true;
    });
});
