/* dashboard.js
   Real-time simulation for SmartBus Web+
   (copy this file to static/js/dashboard/dashboard.js and ensure dashboard.html uses defer)
*/

/* ===========================
   DATA: LOCATIONS, TIMES, DRIVERS, PREFIXES
   =========================== */

const LOCATIONS = [
  "University of San Carlos (USC - Main)",
  "Cebu Institute of Technology - University (CIT-U)",
  "University of San Jose - Recoletos (USJR)",
  "Cebu Normal University (CNU)",
  "University of the Visayas (UV - Colon St.)",
  "University of Cebu - Main Campus",
  "University of Cebu - Banilad Campus",
  "University of the Philippines Cebu (UP Cebu - Lahug)",
  "Southwestern University PHINMA (SWU - Urgello)",
  "Cebu Technological University (CTU - Main)",
  "Ayala Center Cebu",
  "IT Park / Cebu Business Park",
  "SM Seaside City Cebu",
  "Colon Street",
  "Fuente Osmeña Circle",
  "Cebu South Bus Terminal",
  "Cebu North Bus Terminal",
  "Parkmall",
  "Mabolo",
  "Talamban",
  "Guadalupe",
  "Pardo",
  "Lahug / Escario",
  "Mandaue City Center",
  "Talisay City",
  "Minglanilla",
  "South Road Properties (SRP)",
  "Cebu City Sports Center",
  "Banilad",
  "Labangon"
];

const TRAVEL_TIMES = {
  "University of San Carlos (USC - Main)|Cebu Institute of Technology - University (CIT-U)": 18,
  "University of San Carlos (USC - Main)|Cebu Normal University (CNU)": 12,
  "Cebu Institute of Technology - University (CIT-U)|University of San Jose - Recoletos (USJR)": 10,
  "Cebu Institute of Technology - University (CIT-U)|SM Seaside City Cebu": 18,
  "University of the Philippines Cebu (UP Cebu - Lahug)|Ayala Center Cebu": 8,
  "Ayala Center Cebu|IT Park / Cebu Business Park": 6,
  "Fuente Osmeña Circle|Colon Street": 5,
  "Banilad|Talamban": 10,
  "Mandaue City Center|Parkmall": 5,
  "SM Seaside City Cebu|Talisay City": 15,
  "Labangon|Cebu Institute of Technology - University (CIT-U)": 12,
  "Banilad|University of San Carlos (USC - Main)": 25
};

const DRIVERS = [
  "Ramon Dela Cruz","Leo Duran","Josephine Almonte","Paolo Mendoza","Jessa Villamor","Carlos Santos","Maria Reyes","Antonio Flores",
  "Rosa Garcia","Juan Maldonado","Sofia Ramirez","Diego Torres","Carmen Lopez","Miguel Hernandez","Angela Martinez","Roberto Diaz",
  "Francisca Rodriguez","Manuel Gutierrez","Victoria Morales","Fernando Ramos","Isabel Jimenez","Arturo Castillo","Mariana Navarro","Hector Vargas",
  "Elena Ortega","Ricardo Medina","Patricia Soto","Luis Rojas","Adriana Campos","Enrique Salinas","Gabriela Fuentes","Adrian Munoz",
  "Catalina Pena","Raul Herrera","Delia Aguilar","Victor Guerrero","Lucia Dominguez","Sergio Vazquez","Monica Ibarra","Oscar Ruiz",
  "Ines Romero","Esteban Delgado","Silvia Cortes","Andres Molina","Beatriz Acosta","Guillermo Peralta","Norma Alves","Osvaldo Bravo",
  "Lidia Estrada","Wilfredo Ochoa"
];

const PLATE_PREFIXES = {
  "University of San Carlos (USC - Main)": "S",
  "Cebu Institute of Technology - University (CIT-U)": "C",
  "University of the Philippines Cebu (UP Cebu - Lahug)": "U",
  "University of San Jose - Recoletos (USJR)": "J",
  "Cebu Normal University (CNU)": "N",
  "University of the Visayas (UV - Colon St.)": "V",
  "Southwestern University PHINMA (SWU - Urgello)": "W",
  "Cebu Technological University (CTU - Main)": "T",
  "University of Cebu - Main Campus": "E",
  "University of Cebu - Banilad Campus": "B",
  "IT Park / Cebu Business Park": "I",
  "Ayala Center Cebu": "A",
  "SM Seaside City Cebu": "M"
};

/* ===========================
   APP STATE
   =========================== */

const appState = {
  buses: [],
  currentLocation: "",
  destinationLocation: "",
  filteredBuses: [],
  notifications: [],
  isOnline: navigator.onLine,
  trafficActive: false,
  activeFilters: {
    status: '',
    location: ''
  }
};


/* ===========================
   UTIL: Travel time -> seconds
   =========================== */

function getTravelTimeSeconds(from, to) {
  const key1 = `${from}|${to}`;
  const key2 = `${to}|${from}`;
  const minutes = TRAVEL_TIMES[key1] || TRAVEL_TIMES[key2] || null;
  if (minutes) return Math.round(minutes * 60);
  return (Math.floor(Math.random() * 8) + 8) * 60; 
}

/* ===========================
   ETA formatting
   =========================== */

function formatETASeconds(sec) {
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

/* ===========================
   Plate generator
   =========================== */

function generatePlate(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let plate = prefix;
  for (let i=0;i<5;i++) plate += chars.charAt(Math.floor(Math.random()*chars.length));
  return plate;
}

/* ===========================
   Favorites System
   =========================== */


// Load favorites from localStorage
function loadFavorites() {
  const favs = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
  return favs;
}

// Save favorites to localStorage
function saveFavorites(favs) {
  localStorage.setItem('favoriteRoutes', JSON.stringify(favs));
}

// Render favorite buttons in sidebar
function renderFavorites() {
  const favList = document.getElementById('favorite-routes-list');
  const favs = loadFavorites();
  favList.innerHTML = '';

  if(favs.length === 0) {
    favList.innerHTML = '<p>No favorites yet</p>';
    return;
  }

  favs.forEach((route, index) => {
    const btn = document.createElement('button');
    btn.className = 'favorite-route-btn';
    btn.textContent = `🚍 ${route.from} → ${route.to}`;
    btn.onclick = () => applyFavoriteRoute(route.from, route.to);
    favList.appendChild(btn);

    // Optional: remove button
    const removeBtn = document.createElement('span');
    removeBtn.textContent = ' ✕';
    removeBtn.className = 'remove-fav-btn';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeFavorite(index);
    };
    btn.appendChild(removeBtn);
  });
}

// Apply favorite route (set filters & find buses)
function applyFavoriteRoute(from, to) {
  document.getElementById('current-location').value = from;
  document.getElementById('destination-location').value = to;
  findBuses();
}

// Add current route to favorites
function addCurrentRouteToFavorites() {
  const from = document.getElementById('current-location').value;
  const to = document.getElementById('destination-location').value;

  if(!from || !to) {
    showAlert('Select both current and destination locations first', 'warning');
    return;
  }

  let favs = loadFavorites();

  if(favs.some(f => f.from === from && f.to === to)) {
    showAlert('Route already in favorites', 'info');
    return;
  }

  favs.push({from, to});
  saveFavorites(favs);
  renderFavorites();

  showAlert('Route added to favorites', 'success');
  pushNotification(`⭐ Added favorite route: ${from} → ${to}`, {type: 'favorite'});
  showMiniNotification(`Added ${from} → ${to}`);
}


// Remove a favorite
function removeFavorite(index) {
  let favs = loadFavorites();
  favs.splice(index, 1);
  saveFavorites(favs);
  renderFavorites();
  showAlert('Favorite removed', 'info');
}

// Initialize favorites
window.addEventListener('load', () => {
  renderFavorites();
  const addFavBtn = document.getElementById('add-favorite-btn');
  if(addFavBtn) addFavBtn.addEventListener('click', addCurrentRouteToFavorites);
});


/* ===========================
   INITIALIZATION
   =========================== */

window.addEventListener('load',()=>{
  try{
    populateLocationSelects();
    generateBusData();
    startClock();
    setupEventListeners();
    updateBusMetrics();
    startBusCountdown();
    renderBusTable(appState.buses);
    updateNotificationUI();
  }catch(err){
    console.error("Initialization error:",err);
    showAlert("Failed to initialize dashboard","error");
  }
});

function populateLocationSelects(){
  const cur=document.getElementById('current-location');
  const dest=document.getElementById('destination-location');
  const filterloc=document.getElementById('filter-location');
  LOCATIONS.forEach(loc=>{
    [cur,dest,filterloc].forEach(select=>{
      const o=document.createElement('option');
      o.value=loc;
      o.textContent=loc;
      select.appendChild(o);
    });
  });
}

function generateBusData(){
  appState.buses=[];
  for(let i=0;i<50;i++){
    const curIdx=Math.floor(Math.random()*LOCATIONS.length);
    const currentLocation=LOCATIONS[curIdx];
    const nextLocation=LOCATIONS[(curIdx+1)%LOCATIONS.length];
    const prefix=PLATE_PREFIXES[currentLocation]||'X';
    const plate=generatePlate(prefix);
    const etaSeconds=getTravelTimeSeconds(currentLocation,nextLocation)+Math.floor(Math.random()*60);
    const occupancy=Math.floor(Math.random()*26);
    const status=occupancy>=25?"Fully Occupied":"Occupiable";
    const isMaintain=Math.random()<0.02;
    appState.buses.push({
      id:i,
      plateNumber:plate,
      driver:DRIVERS[i%DRIVERS.length],
      currentLocation,
      nextLocation,
      etaSeconds,
      originalEtaSeconds:etaSeconds,
      status:isMaintain?"Maintenance":status,
      occupancy,
      totalCapacity:25
    });
  }
}

/* ===========================
   Clock & traffic
   =========================== */

function startClock(){
  updateClock();
  setInterval(updateClock,1000);
}

function updateClock(){
  const now=new Date();
  const timeEl=document.getElementById('current-time');
  const dateEl=document.getElementById('current-date');
  if(timeEl) timeEl.textContent=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(dateEl) dateEl.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  const wasTraffic=appState.trafficActive;
  appState.trafficActive=isTrafficTime();
  if(appState.trafficActive!==wasTraffic){
    if(appState.trafficActive){
      pushNotification("⚠️ Traffic Time Active — ETAs may increase",{type:'traffic',important:true});
      showMiniNotification("Traffic time active");
      document.getElementById('traffic-alert').style.display='flex';
    }else{
      pushNotification("Traffic interval ended — ETAs returning to normal",{type:'traffic',important:true});
      showMiniNotification("Traffic ended");
      document.getElementById('traffic-alert').style.display='none';
    }
  }
  updateActiveBuses();
}

function isTrafficTime(){
  const now=new Date();
  const minutes=now.getHours()*60+now.getMinutes();
  return (minutes>=405 && minutes<525)||(minutes>=690 && minutes<810)||(minutes>=1010 && minutes<1170);
}

function updateActiveBuses(){
  const now=new Date();
  const hour=now.getHours();
  let activeCount=50;
  if(hour>=5 && hour<23) activeCount=50;
  else if(hour>=3 && hour<5) activeCount=Math.floor(Math.random()*2)+4;
  else if(hour>=23 || (hour>=0 && hour<3)) activeCount=Math.floor(Math.random()*2)+3;
  appState.activeBuses=activeCount;
  const el=document.getElementById('metric-active-buses');
  if(el) el.textContent=activeCount;
}

/* ===========================
   Bus countdown
   =========================== */

function startBusCountdown(){
  setInterval(()=>{
    appState.buses.forEach(bus=>{
      if(bus.etaSeconds>0){
        bus.etaSeconds = Math.max(0, bus.etaSeconds - 1);

        // --- SLOWER OCCUPANCY CHANGE ---
        if(bus.status !== "Maintenance" && Math.random() < 0.3){ // 30% chance per second
          const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
          bus.occupancy = Math.max(0, Math.min(bus.totalCapacity, bus.occupancy + change));
          bus.status = (bus.occupancy >= bus.totalCapacity) ? "Fully Occupied" : "Occupiable";
        }

        if(bus.etaSeconds <= 0){
          arrivedAtStop(bus);
          pushNotification(`🚍 ${bus.plateNumber} (${bus.driver}) arrived at ${bus.currentLocation}`, {type:'arrival'});
          showMiniNotification(`${bus.plateNumber} arrived`);
        }
      }
    });

    const showing = (appState.filteredBuses && appState.filteredBuses.length) ? appState.filteredBuses : appState.buses;
    renderBusTable(showing);
  }, 1000);
}





function arrivedAtStop(bus){
  bus.currentLocation=bus.nextLocation;
  const idx=LOCATIONS.indexOf(bus.currentLocation);
  const nextIdx=(idx+1)%LOCATIONS.length;
  bus.nextLocation=LOCATIONS[nextIdx];

  let newTravel=getTravelTimeSeconds(bus.currentLocation,bus.nextLocation);
  if(appState.trafficActive) newTravel = Math.floor(newTravel * 1.7); // Increase ETA during traffic

  bus.etaSeconds = newTravel + Math.floor(Math.random()*30);
  bus.originalEtaSeconds = newTravel;
  bus.occupancy = Math.floor(Math.random()*26);
  bus.status = (Math.random()<0.02)?"Maintenance":(bus.occupancy>=25?"Fully Occupied":"Occupiable");
}


/* ===========================
   Find buses
   =========================== */

window.findBuses = function() {
  const cur = document.getElementById('current-location').value;
  const dest = document.getElementById('destination-location').value;

  if (!cur || !dest) {
    showAlert('Please select both current location and destination', 'warning');
    return;
  }
  if (cur === dest) {
    showAlert('Current location and destination must be different', 'warning');
    return;
  }

  appState.currentLocation = cur;
  appState.destinationLocation = dest;

  // FILTER ONLY BUSES THAT ARE CURRENTLY AT cur AND GOING TO dest
  appState.filteredBuses = appState.buses.filter(bus =>
    bus.currentLocation === cur && bus.nextLocation === dest
  );

  updateBusMetrics();
  renderBusTable(appState.filteredBuses);
  updateBusCount(appState.filteredBuses.length);

  if (appState.filteredBuses.length === 0)
    showAlert('No buses available for this exact route right now', 'info');
  else
    showAlert(`Found ${appState.filteredBuses.length} buses for this route`, 'success');
};


/* ===========================
   Search & filters
   =========================== */

function performSearch(){
  const q = document.getElementById('search-input').value.toLowerCase().trim();

  if(!q) {
    appState.filteredBuses = null; // clear filter if search is empty
    renderBusTable(appState.buses);
    updateBusCount(appState.buses.length);
    return;
  }

  // Filter buses based on search query
  const base = appState.buses;
  const results = base.filter(bus => {
    return bus.plateNumber.toLowerCase().includes(q) ||
           bus.driver.toLowerCase().includes(q) ||
           bus.currentLocation.toLowerCase().includes(q) ||
           bus.nextLocation.toLowerCase().includes(q);
  });

  appState.filteredBuses = results; // store filtered buses
  renderBusTable(results);
  updateBusCount(results.length);
}


window.toggleAdvancedFilter=function(){
  const p=document.getElementById('advanced-filter-panel');
  if(!p) return;
  p.style.display=(p.style.display==='none'||p.style.display==='')?'block':'none';
};

window.applyFilters = function(){
  // Store active filters
  appState.activeFilters.status = document.getElementById('filter-status').value;
  appState.activeFilters.location = document.getElementById('filter-location').value;

  filterAndRenderBuses();
};


window.resetFilters = function(){
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-location').value = '';

  appState.activeFilters.status = '';
  appState.activeFilters.location = '';

  filterAndRenderBuses();
};

function filterAndRenderBuses() {
  let buses = appState.buses;

  // Apply filters
  if(appState.activeFilters.status) {
    buses = buses.filter(b => b.status === appState.activeFilters.status);
  }
  if(appState.activeFilters.location) {
    buses = buses.filter(b => b.currentLocation === appState.activeFilters.location);
  }

  // Apply search
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  if(q) {
    buses = buses.filter(b =>
      b.plateNumber.toLowerCase().includes(q) ||
      b.driver.toLowerCase().includes(q) ||
      b.currentLocation.toLowerCase().includes(q) ||
      b.nextLocation.toLowerCase().includes(q)
    );
  }

  appState.filteredBuses = buses;
  renderBusTable(buses);
  updateBusCount(buses.length);
}

function clearSearchFilter() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';      // Clear the input
    appState.filteredBuses = null;                // Reset filtered buses
    renderBusTable(appState.buses);               // Show all buses again
    updateBusCount(appState.buses.length);        // Update bus count
}



/* ===========================
   Render table & metrics
   =========================== */

function renderBusTable(buses){
  const tbody=document.getElementById('bus-status-tbody');
  if(!tbody) return;
  if(!buses||buses.length===0){
    tbody.innerHTML='<tr><td colspan="8" class="no-buses-row">No buses match your search criteria</td></tr>';
    return;
  }
  tbody.innerHTML=buses.map(bus=>createBusRow(bus)).join('');
  updateBusCount(buses.length);
  updateNotificationUI();
}

function createBusRow(bus) {
  const etaClass = appState.trafficActive && bus.status !== "Maintenance" ? 'eta-traffic' : '';
  const etaDisplay = bus.status === "Maintenance" ? "-" : formatETASeconds(Math.max(0, Math.round(bus.etaSeconds)));
  const trafficText = bus.status === "Maintenance" ? "-" : (appState.trafficActive ? '⚠️ Traffic' : 'Normal');

  const statusClass = bus.status === "Maintenance" ? 'status-maintenance' :
                      bus.status === "Fully Occupied" ? 'status-full' :
                      'status-occupiable';

  const occupancyDisplay = bus.status === "Maintenance" ? `0 / ${bus.totalCapacity}` : `${bus.occupancy} / ${bus.totalCapacity}`;
  const nextStopDisplay = bus.status === "Maintenance" ? "-" : bus.nextLocation;

  return `
    <tr>
      <td class="plate-no">${bus.plateNumber}</td>
      <td class="driver-name">${bus.driver}</td>
      <td class="location">${bus.currentLocation}</td>
      <td class="next-stop">${nextStopDisplay}</td>
      <td class="eta ${etaClass}">${etaDisplay}</td>
      <td class="status"><span class="status-badge ${statusClass}">${bus.status}</span></td>
      <td class="occupancy">${occupancyDisplay}</td>
      <td class="traffic-indicator">${trafficText}</td>
    </tr>
  `;
}



function updateBusMetrics(){
  const available=appState.buses.filter(b=>b.status==='Occupiable').length;
  const el=document.getElementById('metric-available-buses');
  if(el) el.textContent=available;
}

function updateBusCount(count){
  const el=document.getElementById('shuttle-count');
  if(el) el.textContent=`(${count})`;
}

/* ===========================
   Notifications
   =========================== */

function pushNotification(message,opts={}){
  const latest=appState.notifications[0];
  if(latest && latest.message===message) return;
  const entry={message,time:new Date().toLocaleTimeString(),type:opts.type||'info'};
  appState.notifications.unshift(entry);
  if(appState.notifications.length>20) appState.notifications.pop();
  updateNotificationUI();
  if(opts.important && "Notification" in window && Notification.permission==="granted"){
    try{new Notification("SmartBus",{body:message});}catch(e){}
  }
}

function updateNotificationUI(){
  const badge=document.getElementById('notification-badge');
  const list=document.getElementById('notification-list');
  if(badge){
    if(appState.notifications.length>0){badge.style.display='flex';badge.textContent=appState.notifications.length;}
    else badge.style.display='none';
  }
  if(!list) return;
  if(appState.notifications.length===0){list.innerHTML='<div class="no-notifications">No notifications</div>';return;}
  list.innerHTML=appState.notifications.map(n=>`
    <div class="notification-item">
      <div class="notification-content">
        <p class="notification-message">${n.message}</p>
        <p class="notification-time">${n.time}</p>
      </div>
    </div>
  `).join('');
}

function showMiniNotification(text){
  const card=document.getElementById('notification-mini');
  if(!card) return;
  card.innerHTML=`<div style="min-width:180px;padding:8px 12px;border-radius:8px;background:rgba(0,0,0,0.75);color:#fff;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.4);">${text}</div>`;
  card.style.display='block';
  setTimeout(()=>{card.style.display='none';},3000);
}

window.toggleNotifications=function(){
  const dd=document.getElementById('notification-dropdown');
  if(!dd) return;
  dd.classList.toggle('active');
};

window.clearAllNotifications=function(){
  appState.notifications=[];
  updateNotificationUI();
};

window.requestNotificationPermission=function(){
  if(!("Notification" in window)) return;
  if(Notification.permission==="default") Notification.requestPermission();
};

document.addEventListener('click',(e)=>{
  const dd=document.getElementById('notification-dropdown');
  const bell=document.getElementById('notification-bell');
  if(!dd||!bell) return;
  if(!dd.contains(e.target)&&!bell.contains(e.target)) dd.classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
  const bell = document.getElementById('notification-bell');
  if (bell) {
    bell.addEventListener('click', toggleNotifications);
  }
});


/* ===========================
   Small alerts
   =========================== */

function showAlert(message,type='info'){
  const el=document.getElementById('message-box');
  if(!el) return;
  const cls={success:'bg-green-600',error:'bg-red-600',warning:'bg-yellow-600',info:'bg-blue-600'}[type]||'bg-blue-600';
  el.textContent=message;
  el.className=`message-box ${cls}`;
  el.style.opacity='1';
  setTimeout(()=>el.style.opacity='0',2800);
}

/* ===========================
   Logout
   =========================== */

window.handleLogout=function(){
  showAlert('Logging out...','info');
  setTimeout(()=>{window.location.href='/logout/';},900);
};

/* ===========================
   Event listeners
   =========================== */

function setupEventListeners(){
  const searchInput=document.getElementById('search-input');
  if(searchInput) searchInput.addEventListener('input',debounce(performSearch,250));
}

/* simple debounce */
function debounce(fn,wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t=setTimeout(()=>fn.apply(this,args),wait);
  };
}
