document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Real Buses from API
    loadRealBuses();

    // 2. Setup Sidebar & Time (Keep your existing UI logic)
    setupSidebar();
    updateTime();
    setInterval(updateTime, 1000);
});

async function loadRealBuses() {
    const tableBody = document.querySelector('.shuttle-table tbody');
    if (!tableBody) return;

    try {
        // Fetch data from your new Django API
        const response = await fetch('/app/api/buses/');
        const data = await response.json();

        // Clear "Loading..." or old data
        tableBody.innerHTML = '';

        if (data.success && data.buses.length > 0) {
            data.buses.forEach(bus => {
                const row = document.createElement('tr');
                
                // Set badge colors based on status
                let statusClass = 'badge-secondary';
                if (bus.status === 'Occupiable') statusClass = 'badge-success';
                else if (bus.status === 'Fully Occupied') statusClass = 'badge-danger';
                else if (bus.status === 'Maintenance') statusClass = 'badge-warning';

                row.innerHTML = `
                    <td><strong>${bus.plate_number}</strong></td>
                    <td>${bus.route}</td>
                    <td>${bus.current_location}</td>
                    <td><span class="badge ${statusClass}">${bus.status}</span></td>
                    <td>${bus.occupancy}/${bus.capacity}</td>
                    <td>${bus.eta_minutes} mins</td>
                    <td><button class="btn btn-sm btn-primary">Track</button></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No active buses found in database.</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading buses:', error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error loading data.</td></tr>`;
    }
}

function setupSidebar() {
    // Keep your existing sidebar toggle code here if you have it
    const sidebar = document.querySelector('.sidebar');
    // ... rest of your sidebar logic
}

function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) timeElement.textContent = now.toLocaleTimeString();
    if (dateElement) dateElement.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}