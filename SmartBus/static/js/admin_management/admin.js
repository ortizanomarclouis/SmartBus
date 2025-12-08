// Admin Management JavaScript

// Update current time and date
function updateDateTime() {
  const now = new Date();
  
  // Time
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
  const timeElement = document.getElementById('current-time');
  if (timeElement) timeElement.textContent = timeString;
  
  // Date
  const dateString = now.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const dateElement = document.getElementById('current-date');
  if (dateElement) dateElement.textContent = dateString;
}

// Load bus statistics
function loadBusStats() {
  fetch('{% url "admin_management:bus_stats" %}')
    .then(response => response.json())
    .then(data => {
      const totalBusesEl = document.getElementById('total-buses');
      const activeBusesEl = document.getElementById('active-buses');
      const maintenanceBusesEl = document.getElementById('maintenance-buses');
      const avgOccupancyEl = document.getElementById('avg-occupancy');
      
      if (totalBusesEl) totalBusesEl.textContent = data.total_buses;
      if (activeBusesEl) activeBusesEl.textContent = data.active_buses;
      if (maintenanceBusesEl) maintenanceBusesEl.textContent = data.maintenance_buses;
      if (avgOccupancyEl) avgOccupancyEl.textContent = data.avg_occupancy + '%';
    })
    .catch(error => console.error('Error loading bus stats:', error));
}

// Display messages
function displayMessage(message, messageType = 'info') {
  const messageBox = document.getElementById('message-box');
  if (!messageBox) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `alert alert-${messageType}`;
  messageEl.textContent = message;
  
  messageBox.appendChild(messageEl);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}

// Confirm delete action
function confirmDelete(event) {
  if (!confirm('Are you sure you want to delete this bus?')) {
    event.preventDefault();
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  // Update time immediately and then every second
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Load bus stats on dashboard
  if (document.getElementById('total-buses')) {
    loadBusStats();
    // Refresh stats every 30 seconds
    setInterval(loadBusStats, 30000);
  }
  
  // Add delete confirmation to delete buttons
  const deleteButtons = document.querySelectorAll('.btn-delete');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', confirmDelete);
  });
  
  // Form validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Add any form validation here
      const requiredFields = form.querySelectorAll('[required]');
      let isValid = true;
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = 'red';
          isValid = false;
        } else {
          field.style.borderColor = '';
        }
      });
      
      if (!isValid) {
        e.preventDefault();
        alert('Please fill in all required fields.');
      }
    });
  });
  
  // Search input validation
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      // Debounce search
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        // Auto-submit form or perform AJAX search
      }, 300);
    });
  }
  
  // Numeric input validation
  const numericInputs = document.querySelectorAll('input[type="number"]');
  numericInputs.forEach(input => {
    input.addEventListener('change', function() {
      if (this.min && parseInt(this.value) < parseInt(this.min)) {
        this.value = this.min;
      }
    });
  });
});

// Export functions for inline use
window.confirmDelete = confirmDelete;
window.displayMessage = displayMessage;
window.updateDateTime = updateDateTime;
