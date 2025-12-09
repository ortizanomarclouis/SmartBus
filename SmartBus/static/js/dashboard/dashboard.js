// Global variable to store bus data for filtering
let globalBusData = [];

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
});

async function loadRealBuses() {
    const tableBody = document.querySelector('.shuttle-table tbody');
    if (!tableBody) return;

    try {
        const response = await fetch('/app/api/buses/');
        const data = await response.json();

        if (data.success && data.buses.length > 0) {
            // 1. Store data globally so we can filter it later
            globalBusData = data.buses;

            // 2. Populate Dropdowns (Only once)
            populateLocationDropdowns(globalBusData);

            // 3. Render the full table initially
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

// Reusable function to render the table rows
function renderTable(buses) {
    const tableBody = document.querySelector('.shuttle-table tbody');
    const countSpan = document.getElementById('shuttle-count');
    
    // Clear current rows
    tableBody.innerHTML = '';
    
    // Update Count
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

// --- FILTER FUNCTIONS ---

// 1. Called when user clicks "Find Buses" (Dropdown Logic)
window.findBuses = function() {
    const startLoc = document.getElementById('current-location').value;
    const destLoc = document.getElementById('destination-location').value;

    // Filter logic: Match EITHER current location OR next stop
    const filtered = globalBusData.filter(bus => {
        const matchesStart = startLoc === "" || bus.current_location === startLoc;
        // Simple logic: If destination is chosen, we check if the bus is going there (next_stop)
        // You can adjust this logic if you have more complex route data
        const matchesDest = destLoc === "" || bus.next_stop === destLoc;
        
        return matchesStart && matchesDest;
    });

    renderTable(filtered);
};

// 2. Called when typing in Search Bar
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

// 3. Clear Filters Button
window.clearSearchFilter = function() {
    document.getElementById('search-input').value = '';
    document.getElementById('current-location').value = '';
    document.getElementById('destination-location').value = '';
    
    // Reset to show all data
    renderTable(globalBusData);
};

// --- HELPER FUNCTIONS ---

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