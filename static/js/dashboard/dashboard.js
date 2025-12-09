// Global variable to store bus data for filtering
let globalBusData = [];

// Favorite routes variables
let currentRoute = { from: '', to: '' };
let favoriteRoutes = [];

// Notifications
let notifications = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRealBuses();
    setupSidebar();
    updateTime();
    setInterval(updateTime, 1000);

    // Attach Search Listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterBusesBySearch(e.target.value);
        });
    }

    // Attach Add Favorite Route button
    const addFavoriteBtn = document.getElementById('add-favorite-route');
    if (addFavoriteBtn) {
        addFavoriteBtn.addEventListener('click', addCurrentRouteToFavorites);
        addFavoriteBtn.disabled = true;
        addFavoriteBtn.style.opacity = '0.5';
        addFavoriteBtn.style.cursor = 'not-allowed';
    }

    // Load favorite routes from localStorage
    loadFavoriteRoutes();

    // Notification Bell toggle
const bellBtn = document.getElementById('notification-bell');
const dropdown = document.getElementById('notification-dropdown');
const badge = document.getElementById('notification-badge');
if (bellBtn && dropdown) {
    bellBtn.addEventListener('click', () => {
        // Toggle dropdown visibility
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';

        // If opening the dropdown, mark notifications as read
        if (!isVisible && badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    });
}


    // Clear all notifications button
    const clearBtn = document.getElementById('clear-notifications');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllNotifications);
    }
});

// --- Real Bus Functions ---
async function loadRealBuses() {
    const tableBody = document.querySelector('.shuttle-table tbody');
    if (!tableBody) return;

    try {
        const response = await fetch('/app/api/buses/');
        const data = await response.json();

        if (data.success && data.buses.length > 0) {
            globalBusData = data.buses;
            populateLocationDropdowns(globalBusData);
            renderTable(globalBusData);
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No active buses found.</td></tr>`;
            updateCount(0);
        }
    } catch (error) {
        console.error('Error loading buses:', error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error connecting to server.</td></tr>`;
    }
}

// --- Render Table ---
function renderTable(buses) {
    const tableBody = document.querySelector('.shuttle-table tbody');
    const countSpan = document.getElementById('shuttle-count');
    
    tableBody.innerHTML = '';
    if (countSpan) countSpan.textContent = `(${buses.length})`;

    if (buses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No buses match your search.</td></tr>`;
        return;
    }

    buses.forEach(bus => {
        const row = document.createElement('tr');

        let statusClass = 'badge-secondary';
        if (bus.status === 'Occupiable') statusClass = 'badge-success';
        else if (bus.status === 'Fully Occupied') statusClass = 'badge-danger';
        else if (bus.status === 'Maintenance') statusClass = 'badge-warning';

        let trafficClass = 'badge-success';
        if (bus.traffic_condition === 'Heavy') trafficClass = 'badge-danger';
        else if (bus.traffic_condition === 'Moderate') trafficClass = 'badge-warning';

        row.innerHTML = `
            <td><strong>${bus.plate_number}</strong></td>
            <td>${bus.driver_name}</td>
            <td>${bus.current_location}</td>
            <td>${bus.next_stop || 'Unknown'}</td> 
            <td>${bus.eta_minutes} mins</td>
            <td><span class="badge ${statusClass}">${bus.status}</span></td>
            <td>${bus.occupancy}/${bus.capacity}</td>
            <td><span class="badge ${trafficClass}"> ${bus.traffic_condition}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Filter Functions ---
window.findBuses = function() {
    const startLoc = document.getElementById('current-location').value;
    const destLoc = document.getElementById('destination-location').value;

    currentRoute = { from: startLoc, to: destLoc };

    const filtered = globalBusData.filter(bus => {
        const matchesStart = startLoc === "" || bus.current_location === startLoc;
        const matchesDest = destLoc === "" || bus.next_stop === destLoc;
        return matchesStart && matchesDest;
    });

    renderTable(filtered);

    const addFavoriteBtn = document.getElementById('add-favorite-route');
    if (addFavoriteBtn) {
        if (startLoc && destLoc) {
            addFavoriteBtn.disabled = false;
            addFavoriteBtn.style.opacity = '1';
            addFavoriteBtn.style.cursor = 'pointer';
        } else {
            addFavoriteBtn.disabled = true;
            addFavoriteBtn.style.opacity = '0.5';
            addFavoriteBtn.style.cursor = 'not-allowed';
        }
    }
};

function filterBusesBySearch(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = globalBusData.filter(bus => {
        return (
            bus.plate_number.toLowerCase().includes(lowerQuery) ||
            bus.driver_name.toLowerCase().includes(lowerQuery) ||
            bus.current_location.toLowerCase().includes(lowerQuery) ||
            (bus.next_stop && bus.next_stop.toLowerCase().includes(lowerQuery))
        );
    });
    renderTable(filtered);
}

window.clearSearchFilter = function() {
    document.getElementById('search-input').value = '';
    document.getElementById('current-location').value = '';
    document.getElementById('destination-location').value = '';
    currentRoute = { from: '', to: '' };
    const addFavoriteBtn = document.getElementById('add-favorite-route');
    if (addFavoriteBtn) {
        addFavoriteBtn.disabled = true;
        addFavoriteBtn.style.opacity = '0.5';
        addFavoriteBtn.style.cursor = 'not-allowed';
    }
    renderTable(globalBusData);
};

// --- Favorite Routes Functions ---
function loadFavoriteRoutes() {
    try {
        const saved = localStorage.getItem('favoriteRoutes');
        if (saved) favoriteRoutes = JSON.parse(saved);
        renderFavoriteRoutes();
    } catch (error) {
        console.error('Error loading favorite routes:', error);
        favoriteRoutes = [];
    }
}

function saveFavoriteRoutes() {
    try {
        localStorage.setItem('favoriteRoutes', JSON.stringify(favoriteRoutes));
    } catch (error) {
        console.error('Error saving favorite routes:', error);
    }
}

function addCurrentRouteToFavorites() {
    if (!currentRoute.from || !currentRoute.to) {
        alert('Please select both current location and destination first!');
        return;
    }

    const exists = favoriteRoutes.some(r => r.from === currentRoute.from && r.to === currentRoute.to);
    if (exists) {
        alert('This route is already in your favorites!');
        return;
    }

    const newRoute = { ...currentRoute, id: Date.now() };
    favoriteRoutes.unshift(newRoute);
    saveFavoriteRoutes();
    renderFavoriteRoutes();
    showNotification(`Added favorite route: ${currentRoute.from} → ${currentRoute.to}`);
}

function renderFavoriteRoutes() {
    const container = document.getElementById('favorite-routes-list');
    if (!container) return;

    if (favoriteRoutes.length === 0) {
        container.innerHTML = '<p class="no-favorites">No favorite routes yet. Add one by selecting a route and clicking "Add Current Route".</p>';
        return;
    }

    container.innerHTML = favoriteRoutes.map(route => `
        <div class="favorite-route-item" data-id="${route.id}">
            <span class="route-path">${route.from} → ${route.to}</span>
            <button class="btn-use-route" onclick="useRoute('${route.from}','${route.to}')">Use</button>
            <button class="btn-delete-route" onclick="deleteRoute(${route.id})">Delete</button>
        </div>
    `).join('');
}

window.useRoute = function(from, to) {
    const startSelect = document.getElementById('current-location');
    const destSelect = document.getElementById('destination-location');
    if (startSelect && destSelect) {
        startSelect.value = from;
        destSelect.value = to;
        findBuses();
    }
}

window.deleteRoute = function(routeId) {
    const deletedRoute = favoriteRoutes.find(r => r.id === routeId);
    favoriteRoutes = favoriteRoutes.filter(r => r.id !== routeId);
    saveFavoriteRoutes();
    renderFavoriteRoutes();
    if (deletedRoute) showNotification(`Deleted favorite route: ${deletedRoute.from} → ${deletedRoute.to}`);
}

// --- Notification Functions ---
function showNotification(message) {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');

    if (!list || !badge) return;

    const notification = { id: Date.now(), message };
    notifications.unshift(notification);

    list.innerHTML = notifications.map(n => `<div class="notification-item">${n.message}</div>`).join('');
    badge.style.display = 'inline-block';
    badge.textContent = notifications.length;
}

function clearAllNotifications() {
    notifications = [];
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    if (list) list.innerHTML = '<div class="no-notifications">No notifications</div>';
    if (badge) {
        badge.style.display = 'none';
        badge.textContent = '0';
    }
}

// --- Helper Functions ---
function populateLocationDropdowns(buses) {
    const startSelect = document.getElementById('current-location');
    const endSelect = document.getElementById('destination-location');

    if (!startSelect || !endSelect) return;

    const locations = new Set();
    buses.forEach(bus => {
        if (bus.current_location) locations.add(bus.current_location);
        if (bus.next_stop) locations.add(bus.next_stop);
    });

    startSelect.innerHTML = '<option value="">-- Choose Current Location --</option>';
    endSelect.innerHTML = '<option value="">-- Choose Destination --</option>';

    locations.forEach(loc => {
        const option1 = document.createElement("option");
        option1.value = loc;
        option1.text = loc;
        startSelect.add(option1);

        const option2 = document.createElement("option");
        option2.value = loc;
        option2.text = loc;
        endSelect.add(option2);
    });
}

function updateCount(num) {
    const countSpan = document.getElementById('shuttle-count');
    if (countSpan) countSpan.textContent = `(${num})`;
}

function setupSidebar() {
    const sidebar = document.querySelector('.sidebar');
}

function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    if (timeElement) timeElement.textContent = now.toLocaleTimeString();
    if (dateElement) dateElement.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
