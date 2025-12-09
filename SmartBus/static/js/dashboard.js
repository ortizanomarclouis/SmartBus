const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-smartbus-app-id';
const supabaseUrl = typeof __supabase_url !== 'undefined' ? __supabase_url : 'https://azzhzwknftoymvgrbgzt.supabase.co';
const supabaseAnonKey = typeof __supabase_anon_key !== 'undefined' ? __supabase_anon_key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6emh6d2tuZnRveW12Z3JiZ3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTU5NTQsImV4cCI6MjA3NDc5MTk1NH0.-xV5Mqx87uEibjMSHw0RMF5dZL85aJpJLQ0-h-6cevc';

let supabase;
let currentUserId = 'anonymous';
let isAuthReady = false;
let realtimeChannel = null;
let notificationsArray = [];
let offlineCache = {};
let isOnline = navigator.onLine;

const ALL_ROUTES = [
    "All Routes", "Cebu City", "Mandaue", "Talamban", "Lahug", "SM Seaside",
    "IT Park", "Colon", "Pardo", "Talisay", "Escario", "Ayala Center", "Guadalupe"
];

const BUSES_TABLE = 'buses';

const SHUTTLE_MOCK_DATA = [
    { bus_id: 'SB-101', route: 'Talamban', status: 'Active', last_location: 'IT Park', occupancy: 65, eta: 3, driver: 'R. Dela Cruz', next_stop: 'USC Main' },
    { bus_id: 'SB-102', route: 'SM Seaside', status: 'Active', last_location: 'Talisay', occupancy: 40, eta: 15, driver: 'E. Magno', next_stop: 'SRP' },
    { bus_id: 'SB-103', route: 'Colon', status: 'Delayed', last_location: 'Pardo', occupancy: 90, eta: 22, driver: 'N. Fiel', next_stop: 'Carbon Market' },
    { bus_id: 'SB-104', route: 'Mandaue', status: 'Maintenance', last_location: 'Depot A', occupancy: 0, eta: 0, driver: 'N/A', next_stop: 'N/A' },
    { bus_id: 'SB-105', route: 'IT Park', status: 'Active', last_location: 'Escario', occupancy: 70, eta: 8, driver: 'J. Batiancila', next_stop: 'IT Park Entrance' },
    { bus_id: 'SB-106', route: 'Guadalupe', status: 'Active', last_location: 'Ayala Center', occupancy: 50, eta: 2, driver: 'M. Castro', next_stop: 'Guadalupe Terminal' },
    { bus_id: 'SB-107', route: 'Cebu City', status: 'Active', last_location: 'Lahug', occupancy: 80, eta: 10, driver: 'A. Lim', next_stop: 'City Hall' },
    { bus_id: 'SB-108', route: 'Talisay', status: 'Active', last_location: 'Cebu City', occupancy: 30, eta: 18, driver: 'B. Dimaano', next_stop: 'Talisay Plaza' },
    { bus_id: 'SB-109', route: 'Escario', status: 'Active', last_location: 'Mandaue', occupancy: 55, eta: 4, driver: 'C. Santos', next_stop: 'Capitol Building' },
];

// Initialize offline cache from localStorage
function initializeOfflineCache() {
    const cached = localStorage.getItem('busCache');
    if (cached) {
        try {
            offlineCache = JSON.parse(cached);
            console.log('Loaded offline cache:', Object.keys(offlineCache).length, 'buses');
        } catch (e) {
            console.error('Error parsing cache:', e);
            offlineCache = {};
        }
    }
}

// Update offline cache
function updateOfflineCache(buses) {
    const cache = {};
    buses.forEach(bus => {
        const busId = bus.busId || bus.bus_id;
        cache[busId] = {
            ...bus,
            busId: busId,
            cachedAt: new Date().toISOString()
        };
    });
    localStorage.setItem('busCache', JSON.stringify(cache));
    offlineCache = cache;
}

// Online/Offline status handlers
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    const statusIndicator = document.getElementById('online-status');
    if (statusIndicator) {
        statusIndicator.innerHTML = `
            <div class="flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${isOnline ? 'bg-smart-success/20 text-smart-success' : 'bg-red-500/20 text-red-400'}">
                <div class="w-2 h-2 rounded-full ${isOnline ? 'bg-smart-success' : 'bg-red-400'}"></div>
                <span>${isOnline ? 'Online' : 'Offline'}</span>
            </div>
        `;
    }
    
    if (!isOnline) {
        alertMessage('You are offline. Showing cached data.', 'bg-yellow-600');
    } else {
        alertMessage('Back online!', 'bg-smart-success');
        setupBusDataListener();
    }
}

// Notification system
function addNotification(busId, route, eta, message) {
    const notificationId = `${busId}-${eta}`;
    
    // Check if notification already exists
    if (notificationsArray.find(n => n.id === notificationId)) {
        return;
    }
    
    const notification = {
        id: notificationId,
        busId,
        route,
        eta,
        message,
        timestamp: new Date()
    };
    
    notificationsArray.unshift(notification);
    if (notificationsArray.length > 10) {
        notificationsArray = notificationsArray.slice(0, 10);
    }
    
    updateNotificationUI();
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SmartBus Alert', {
            body: message,
            icon: '🚌'
        });
    }
}

function updateNotificationUI() {
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    
    if (notificationBadge) {
        if (notificationsArray.length > 0) {
            notificationBadge.textContent = notificationsArray.length;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    if (notificationList) {
        if (notificationsArray.length === 0) {
            notificationList.innerHTML = '<div class="p-4 text-center text-gray-400">No notifications</div>';
        } else {
            notificationList.innerHTML = notificationsArray.map(notif => `
                <div class="p-4 hover:bg-gray-700/50 transition-colors border-b border-gray-700">
                    <div class="flex items-start space-x-3">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-smart-primary flex-shrink-0 mt-1"></i>
                        <div class="flex-1">
                            <p class="text-sm">${notif.message}</p>
                            <p class="text-xs text-gray-400 mt-1">${notif.timestamp.toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function clearAllNotifications() {
    notificationsArray = [];
    updateNotificationUI();
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                alertMessage('Notifications enabled!', 'bg-smart-success');
            }
        });
    }
}

// Search and filter functionality
function applySearchAndFilter() {
    const searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';
    const selectedRoute = document.getElementById('route-filter')?.value || 'All Routes';
    
    setupBusDataListener();
    
    // Update active filters display
    updateActiveFilters(searchQuery, selectedRoute);
}

function updateActiveFilters(searchQuery, selectedRoute) {
    const filtersContainer = document.getElementById('active-filters');
    if (!filtersContainer) return;
    
    let filtersHTML = '';
    
    if (selectedRoute !== 'All Routes') {
        filtersHTML += `
            <span class="px-3 py-1 bg-smart-success/20 text-smart-success rounded-full text-sm flex items-center gap-2">
                ${selectedRoute}
                <button onclick="clearRouteFilter()" class="hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </span>
        `;
    }
    
    if (searchQuery) {
        filtersHTML += `
            <span class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2">
                "${searchQuery}"
                <button onclick="clearSearchFilter()" class="hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </span>
        `;
    }
    
    if (filtersHTML) {
        filtersContainer.innerHTML = `
            <div class="mt-4 flex items-center gap-2">
                <span class="text-sm text-gray-400">Active filters:</span>
                ${filtersHTML}
            </div>
        `;
    } else {
        filtersContainer.innerHTML = '';
    }
}

window.clearRouteFilter = function() {
    const routeFilter = document.getElementById('route-filter');
    if (routeFilter) {
        routeFilter.value = 'All Routes';
        applySearchAndFilter();
    }
};

window.clearSearchFilter = function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        applySearchAndFilter();
    }
};

function setLoadingState(isLoading, message = 'Loading bus data...') {
    const tbody = document.getElementById('bus-status-tbody');
    if (isLoading && tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-500">${message}</td></tr>`;
    }
}

function alertMessage(message, colorClass) {
    const msgBox = document.getElementById('message-box');
    if (msgBox) {
        msgBox.textContent = message;
        msgBox.className = `fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl text-white font-bold transition-opacity duration-300 ${colorClass} z-50`;
        msgBox.style.opacity = '1';
        setTimeout(() => {
            msgBox.style.opacity = '0';
        }, 3000);
    }
}

async function initializeSupabase() {
    try {
        initializeOfflineCache();
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn("Supabase config is missing. Using mock data.");
            displayMockData();
            return;
        }

        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        
        supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Auth error:", error);
            const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
            if (anonError) {
                console.error("Anonymous sign-in failed:", anonError);
                displayCachedOrMockData();
                return;
            }
            currentUserId = anonData.session?.user?.id || 'anonymous';
        } else if (session) {
            currentUserId = session.user.id;
        } else {
            const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
            if (anonError) {
                console.error("Anonymous sign-in failed:", anonError);
                displayCachedOrMockData();
                return;
            }
            currentUserId = anonData.session?.user?.id || 'anonymous';
        }

        isAuthReady = true;
        console.log("Authenticated with Supabase. User ID:", currentUserId);
        
        await setupInitialData();
        renderFilterOptions();
        setupBusDataListener();

    } catch (error) {
        console.error("Supabase initialization failed:", error);
        alertMessage('Error: Database connection failed.', 'bg-red-700');
        displayCachedOrMockData();
    }
}

function displayCachedOrMockData() {
    if (Object.keys(offlineCache).length > 0) {
        console.log("Displaying cached data...");
        const cachedBuses = Object.values(offlineCache);
        displayMockData(cachedBuses);
    } else {
        displayMockData();
    }
}

async function setupInitialData() {
    try {
        const { data: existingBuses, error } = await supabase
            .from(BUSES_TABLE)
            .select('bus_id')
            .limit(1);

        if (error) {
            console.error("Error checking existing data:", error);
            displayCachedOrMockData();
            return;
        }

        if (!existingBuses || existingBuses.length === 0) {
            console.log("Creating mock data in Supabase...");
            
            const { error: insertError } = await supabase
                .from(BUSES_TABLE)
                .insert(SHUTTLE_MOCK_DATA);

            if (insertError) {
                console.error("Error inserting mock data:", insertError);
                displayCachedOrMockData();
            } else {
                console.log("Mock data created successfully in Supabase.");
            }
        }
    } catch (error) {
        console.error("Error setting up initial data:", error);
        displayCachedOrMockData();
    }
}

function renderFilterOptions() {
    const routeFilter = document.getElementById('route-filter');
    if (routeFilter) {
        routeFilter.innerHTML = '';
        ALL_ROUTES.forEach(route => {
            const option = document.createElement('option');
            option.value = route;
            option.textContent = route;
            routeFilter.appendChild(option);
        });
    }
}

window.setupBusDataListener = async function() {
    if (!isOnline) {
        displayCachedOrMockData();
        return;
    }
    
    if (!supabase || !isAuthReady) {
        console.warn("Supabase not ready. Using cached or mock data.");
        displayCachedOrMockData();
        return;
    }

    setLoadingState(true, 'Fetching live data...');

    try {
        if (realtimeChannel) {
            await supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        const routeFilter = document.getElementById('route-filter');
        const searchInput = document.getElementById('search-input');
        const selectedRoute = routeFilter ? routeFilter.value : "All Routes";
        const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
        
        let query = supabase.from(BUSES_TABLE).select('*');

        if (selectedRoute !== "All Routes") {
            query = query.eq('route', selectedRoute);
        }

        const { data: buses, error } = await query;

        if (error) {
            console.error("Error fetching buses:", error);
            alertMessage(`Error: ${error.message}`, 'bg-red-700');
            displayCachedOrMockData();
            return;
        }

        let filteredBuses = buses || [];
        
        // Apply search filter
        if (searchQuery) {
            filteredBuses = filteredBuses.filter(bus => {
                const busId = (bus.busId || bus.bus_id || '').toLowerCase();
                const route = (bus.route || '').toLowerCase();
                const location = (bus.lastLocation || bus.last_location || '').toLowerCase();
                const nextStop = (bus.nextStop || bus.next_stop || '').toLowerCase();
                const driver = (bus.driver || '').toLowerCase();
                
                return busId.includes(searchQuery) || 
                       route.includes(searchQuery) || 
                       location.includes(searchQuery) || 
                       nextStop.includes(searchQuery) ||
                       driver.includes(searchQuery);
            });
        }

        updateDashboard(filteredBuses);
        updateOfflineCache(buses || []);

        const channelName = selectedRoute !== "All Routes" 
            ? `buses-${selectedRoute.replace(/\s+/g, '-').toLowerCase()}`
            : 'buses-all';

        realtimeChannel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: BUSES_TABLE,
                filter: selectedRoute !== "All Routes" ? `route=eq.${selectedRoute}` : undefined
            }, (payload) => {
                console.log('Realtime update received:', payload);
                setupBusDataListener();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to realtime updates');
                }
            });

        document.getElementById('user-id-display').textContent = `User: ${currentUserId}`;

    } catch (error) {
        console.error("Error setting up listener:", error);
        displayCachedOrMockData();
    }
};

function displayMockData(customData = null) {
    console.log("Displaying data...");
    renderFilterOptions();
    
    const searchInput = document.getElementById('search-input');
    const routeFilter = document.getElementById('route-filter');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedRoute = routeFilter ? routeFilter.value : 'All Routes';
    
    let dataToDisplay = customData || SHUTTLE_MOCK_DATA.map(bus => ({
        ...bus,
        busId: bus.bus_id,
        lastLocation: bus.last_location,
        nextStop: bus.next_stop
    }));
    
    // Apply filters
    if (selectedRoute !== 'All Routes') {
        dataToDisplay = dataToDisplay.filter(bus => bus.route === selectedRoute);
    }
    
    if (searchQuery) {
        dataToDisplay = dataToDisplay.filter(bus => {
            const busId = (bus.busId || bus.bus_id || '').toLowerCase();
            const route = (bus.route || '').toLowerCase();
            const location = (bus.lastLocation || bus.last_location || '').toLowerCase();
            const nextStop = (bus.nextStop || bus.next_stop || '').toLowerCase();
            const driver = (bus.driver || '').toLowerCase();
            
            return busId.includes(searchQuery) || 
                   route.includes(searchQuery) || 
                   location.includes(searchQuery) || 
                   nextStop.includes(searchQuery) ||
                   driver.includes(searchQuery);
        });
    }
    
    updateDashboard(dataToDisplay);
}

function updateDashboard(buses) {
    const normalizedBuses = buses.map(bus => ({
        busId: bus.busId || bus.bus_id,
        route: bus.route,
        status: bus.status,
        lastLocation: bus.lastLocation || bus.last_location,
        nextStop: bus.nextStop || bus.next_stop || 'N/A',
        occupancy: bus.occupancy,
        eta: bus.eta,
        driver: bus.driver
    }));

    const activeBuses = normalizedBuses.filter(b => b.status === 'Active').length;
    const totalDeployedBuses = SHUTTLE_MOCK_DATA.length;
    const onTimeBuses = normalizedBuses.filter(b => b.eta <= 10 && b.status === 'Active').length;
    const onTimeRate = totalDeployedBuses > 0 ? ((onTimeBuses / totalDeployedBuses) * 100).toFixed(0) : 0;

    document.getElementById('metric-active-buses').textContent = activeBuses;
    document.getElementById('metric-on-time-rate').textContent = `${onTimeRate}%`;
    document.getElementById('metric-offline-buses').textContent = totalDeployedBuses - activeBuses;

    // Check for arriving buses and send notifications
    normalizedBuses.forEach(bus => {
        if (bus.status === 'Active' && bus.eta <= 5 && bus.eta > 0) {
            addNotification(
                bus.busId,
                bus.route,
                bus.eta,
                `Bus ${bus.busId} on ${bus.route} route arriving in ${bus.eta} minutes!`
            );
        }
    });

    const tbody = document.getElementById('bus-status-tbody');
    tbody.innerHTML = '';

    normalizedBuses.sort((a, b) => a.eta - b.eta).forEach(bus => {
        const isArrivingSoon = bus.eta <= 5 && bus.status === 'Active';
        
        const statusClass = bus.status === 'Active' ? 'bg-smart-success text-smart-dark' : 
                           bus.status === 'Delayed' ? 'bg-yellow-400 text-gray-900' : 
                           'bg-red-500 text-smart-white';

        const etaText = bus.status !== 'Active' ? 'N/A' : (bus.eta <= 0 ? 'ARRIVED' : `${bus.eta} min`);
        const etaStyle = isArrivingSoon ? 'font-extrabold text-smart-primary text-lg' : 'text-smart-white';
        
        const occupancyColor = bus.occupancy >= 80 ? 'text-red-400' : 
                              bus.occupancy >= 60 ? 'text-yellow-400' : 'text-green-400';

        const row = `
            <tr class="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                <td class="px-6 py-3 font-medium text-smart-primary">${bus.busId || 'N/A'}</td>
                <td class="px-6 py-3 text-sm text-smart-white">${bus.route || 'N/A'}</td>
                <td class="px-6 py-3 text-sm text-gray-400">${bus.nextStop || 'N/A'}</td>
                <td class="px-6 py-3 ${etaStyle}">${etaText}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${bus.status || 'Offline'}
                    </span>
                </td>
                <td class="px-6 py-3 text-sm text-smart-white">${bus.lastLocation || 'Depot'}</td>
                <td class="px-6 py-3 text-sm font-semibold ${occupancyColor}">${bus.occupancy || 0}%</td>
                <td class="px-6 py-3 text-sm text-gray-400">${bus.driver || 'N/A'}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    if (normalizedBuses.length === 0) {
        const currentRoute = document.getElementById('route-filter')?.value || 'All Routes';
        const currentSearch = document.getElementById('search-input')?.value || '';
        const message = currentSearch ? `No buses found matching "${currentSearch}"` : `No buses found for: ${currentRoute}`;
        tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="8" class="p-6 text-center text-gray-500">${message}</td></tr>`);
    }
    
    // Update shuttle count
    const shuttleCount = document.getElementById('shuttle-count');
    if (shuttleCount) {
        shuttleCount.textContent = `(${normalizedBuses.length})`;
    }
}

// Simulate ETA countdown
function startETACountdown() {
    setInterval(() => {
        if (supabase && isAuthReady && isOnline) {
            // Real-time updates will handle this
            return;
        }
        
        // Update mock data ETAs
        SHUTTLE_MOCK_DATA.forEach(bus => {
            if (bus.status === 'Active' && bus.eta > 0) {
                bus.eta = Math.max(0, bus.eta - 1);
            }
        });
        
        displayMockData();
    }, 60000); // Every minute
}

window.handleLogout = async function() {
    alertMessage('Signing out...', 'bg-smart-secondary');
    
    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.error("Logout error:", error);
    }

    setTimeout(() => {
        window.location.href = '/logout/';
    }, 500);
};

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('current-time').textContent = timeStr;
    document.getElementById('current-date').textContent = dateStr;
}

// Close notifications when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notification-dropdown');
    const bellButton = document.getElementById('notification-bell');
    
    if (dropdown && !dropdown.contains(event.target) && !bellButton?.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

window.addEventListener('load', () => {
    initializeSupabase();
    setInterval(updateClock, 1000);
    updateClock();
    startETACountdown();
    updateOnlineStatus();

    // Event listeners
    const routeFilter = document.getElementById('route-filter');
    if (routeFilter) {
        routeFilter.addEventListener('change', applySearchAndFilter);
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', applySearchAndFilter);
    }
    
    // Online/offline event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});