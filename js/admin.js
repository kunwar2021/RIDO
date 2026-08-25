/**
 * RIDO - Admin Dashboard Logic
 */

const AdminApp = {
  data: {
    users: [], drivers: [], companies: [], vehicles: [], trips: [], alerts: [], activity: []
  },

  init() {
    this.checkAuth();
    if (window.location.pathname.includes('admin-dashboard.html')) {
      this.loadData();
      this.bindEvents();
      this.navigateTo('dashboard');
      this.startSimulations();
    }
  },

  checkAuth() {
    const isLogin = window.location.pathname.includes('admin-login.html');
    const session = localStorage.getItem('rido_admin_session');

    if (!session && !isLogin) {
      window.location.href = 'admin-login.html';
    } else if (session && isLogin) {
      window.location.href = 'admin-dashboard.html';
    }

    if (session) {
      const user = JSON.parse(session);
      const nameEl = document.getElementById('admin-user-name');
      if (nameEl) nameEl.textContent = user.name;
    }
  },

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const err = document.getElementById('login-error');

    if (email === 'admin@ridosaathi.com' && pass === 'Admin@123') {
      localStorage.setItem('rido_admin_session', JSON.stringify({
        email, name: 'System Admin', role: 'admin', timestamp: Date.now()
      }));
      window.location.href = 'admin-dashboard.html';
    } else {
      err.classList.remove('hidden');
    }
  },

  logout() {
    localStorage.removeItem('rido_admin_session');
    window.location.href = 'admin-login.html';
  },

  bindEvents() {
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        if (target) this.navigateTo(target);
      });
    });
  },

  navigateTo(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
    
    const view = document.getElementById(`view-${viewId}`);
    if (view) view.classList.add('active');
    
    const navBtn = document.querySelector(`.admin-nav-item[data-target="${viewId}"]`);
    if (navBtn) navBtn.classList.add('active');

    this.renderView(viewId);
  },

  loadData() {
    const mainData = JSON.parse(localStorage.getItem('rido_state_v1') || '{}');
    const companyAcc = JSON.parse(localStorage.getItem('rido_company_accounts') || '[]');
    const driverAcc = JSON.parse(localStorage.getItem('rido_driver_accounts') || '[]');
    const activeTrip = JSON.parse(localStorage.getItem('rido_active_trip') || 'null');
    
    this.data.companies = companyAcc.length > 0 ? companyAcc : [
      { id: 'comp_1', companyName: 'TransIndia Logistics', activeVehicles: 45, status: 'Active' },
      { id: 'comp_2', companyName: 'BlueDart Express', activeVehicles: 112, status: 'Active' }
    ];

    this.data.drivers = driverAcc.length > 0 ? driverAcc : [
      { id: 'DRV-101', name: 'Rajinder Singh', vehicle: 'TRK-NATIONAL-01', status: 'On Route', location: 'NH-48' },
      { id: 'DRV-102', name: 'Amit Sharma', vehicle: 'MH04CD5678', status: 'Delayed', location: 'Mumbai Traffic' }
    ];

    this.data.vehicles = (mainData.data && mainData.data.vehicles) ? mainData.data.vehicles : [
      { id: 'PB10AB1234', type: 'Heavy Truck', healthScore: 92, status: 'Active' },
      { id: 'DL01GH3456', type: 'Electric Van', healthScore: 99, status: 'Available' }
    ];

    this.data.trips = activeTrip ? [activeTrip] : [
      { tripId: 'TRP-1001', driverName: 'Rajinder Singh', companyName: 'TransIndia', originHub: 'Delhi', destinationHub: 'Mumbai', status: 'IN_PROGRESS', progress: 45 }
    ];

    const alerts = JSON.parse(localStorage.getItem('rido_admin_alerts') || '[]');
    this.data.alerts = alerts.length > 0 ? alerts : [
      { id: 'A1', title: 'Vehicle Health Warning', severity: 'High', description: 'Engine temp high on TRK-01', status: 'Active', timestamp: Date.now() }
    ];

    const activity = JSON.parse(localStorage.getItem('rido_admin_activity') || '[]');
    this.data.activity = activity.length > 0 ? activity : [
      { id: 'ACT1', timestamp: Date.now() - 3600000, event: 'Driver Rajinder started Trip #TRP-1001', user: 'Driver' }
    ];

    this.data.users = [
      { name: 'System Admin', email: 'admin@ridosaathi.com', role: 'Admin', status: 'Active' },
      { name: 'Rajinder Singh', email: 'rajinder@transindia.in', role: 'Driver', status: 'Active' },
      { name: 'Vikram Mehta', email: 'admin@transindia.in', role: 'Company', status: 'Active' }
    ];
  },

  renderView(viewId) {
    if (viewId === 'dashboard') this.renderDashboard();
    else if (viewId === 'drivers') this.renderDrivers();
    else if (viewId === 'companies') this.renderCompanies();
    else if (viewId === 'vehicles') this.renderVehicles();
    else if (viewId === 'trips') this.renderTrips();
    else if (viewId === 'alerts') this.renderAlerts();
    else if (viewId === 'activity') this.renderActivity();
    else if (viewId === 'users') this.renderUsers();
    else if (viewId === 'tracking') this.renderTracking();
  },

  renderDashboard() {
    const elUsers = document.getElementById('kpi-users');
    const elDrivers = document.getElementById('kpi-drivers');
    const elComp = document.getElementById('kpi-companies');
    const elVehicles = document.getElementById('kpi-vehicles');
    const elTrips = document.getElementById('kpi-trips');
    
    if(elUsers) elUsers.textContent = '128';
    if(elDrivers) elDrivers.textContent = '84';
    if(elComp) elComp.textContent = '42';
    if(elVehicles) elVehicles.textContent = '156';
    if(elTrips) elTrips.textContent = '24';
    
    const acts = this.data.activity.slice(0, 5).map(a => `
      <div class="py-2.5 border-b border-slate-100 last:border-0 flex gap-2 text-xs">
        <div class="text-slate-400 font-mono text-[10px] mt-0.5">${new Date(a.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
        <div class="text-slate-800"><span class="font-bold text-orange-600">[${a.user}]</span> ${a.event}</div>
      </div>
    `).join('');
    const ra = document.getElementById('dash-recent-activity');
    if(ra) ra.innerHTML = acts;

    // Render User Activity Canvas
    this.renderActivityChart();
  },

  renderActivityChart() {
    const canvas = document.getElementById('chart-admin-activity-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeUsers = [68, 84, 110, 95, 128, 72, 54];
    const maxVal = 140;
    const pad = { top: 20, right: 20, bottom: 30, left: 35 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = (chartW / days.length) * 0.45;

    // Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      const label = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 6, y + 3);
    }

    days.forEach((day, i) => {
      const x = pad.left + i * (chartW / days.length) + (chartW / days.length - barW) / 2;
      const barH = (activeUsers[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day, x + barW / 2, h - 8);
    });
  },

  renderDrivers() {
    const html = this.data.drivers.map(d => `
      <tr>
        <td class="font-bold">${d.name}</td>
        <td class="font-mono text-slate-500">${d.id}</td>
        <td>${d.vehicle || 'Unassigned'}</td>
        <td>${d.location || '--'}</td>
        <td><span class="status-badge status-${d.status.includes('Route')?'green':d.status==='Offline'?'gray':'yellow'}">${d.status}</span></td>
        <td><button class="text-orange-600 font-bold hover:underline">View</button></td>
      </tr>
    `).join('');
    const el = document.getElementById('table-drivers');
    if(el) el.innerHTML = html;
  },

  renderCompanies() {
    const html = this.data.companies.map(c => `
      <tr>
        <td class="font-bold">${c.companyName}</td>
        <td class="font-mono text-slate-500">${c.id}</td>
        <td>${c.activeVehicles || 0} Vehicles</td>
        <td><span class="status-badge status-green">${c.status || 'Active'}</span></td>
        <td><button class="text-orange-600 font-bold hover:underline">Manage</button></td>
      </tr>
    `).join('');
    const el = document.getElementById('table-companies');
    if(el) el.innerHTML = html;
  },

  renderVehicles() {
    const html = this.data.vehicles.map(v => `
      <tr>
        <td class="font-bold font-mono">${v.id}</td>
        <td>${v.type || v.category || 'Truck'}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="w-16 h-2 bg-slate-200 rounded-full"><div class="h-full bg-${v.healthScore > 80 ? 'green' : 'yellow'}-500 rounded-full" style="width:${v.healthScore}%"></div></div>
            <span class="text-xs font-bold">${v.healthScore}%</span>
          </div>
        </td>
        <td><span class="status-badge status-${v.status==='Active'||v.status==='Available'?'green':'yellow'}">${v.status || 'Active'}</span></td>
      </tr>
    `).join('');
    const el = document.getElementById('table-vehicles');
    if(el) el.innerHTML = html;
  },

  renderTrips() {
    const html = this.data.trips.map(t => `
      <tr>
        <td class="font-bold font-mono text-xs">${t.tripId}</td>
        <td>${t.driverName}</td>
        <td>${t.originHub?t.originHub.split(',')[0]:''} &rarr; ${t.destinationHub?t.destinationHub.split(',')[0]:''}</td>
        <td>
          <div class="w-full bg-slate-200 rounded-full h-1.5 mt-1"><div class="bg-blue-500 h-1.5 rounded-full" style="width: ${t.progress||50}%"></div></div>
        </td>
        <td><span class="status-badge status-${t.status && t.status.includes('PROGRESS')?'blue':'yellow'}">${t.status}</span></td>
      </tr>
    `).join('');
    const el = document.getElementById('table-trips');
    if(el) el.innerHTML = html;
  },

  renderAlerts() {
    const html = this.data.alerts.map(a => `
      <div class="admin-card severity-${a.severity.toLowerCase()} mb-3">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-bold text-slate-900">${a.title}</h4>
            <p class="text-sm text-slate-600 mt-1">${a.description}</p>
            <div class="text-xs text-slate-400 mt-2">${new Date(a.timestamp).toLocaleString()}</div>
          </div>
          <button class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition">Acknowledge</button>
        </div>
      </div>
    `).join('');
    const el = document.getElementById('list-alerts');
    if(el) el.innerHTML = html;
  },

  renderActivity() {
    const html = this.data.activity.map(a => `
      <tr>
        <td class="text-xs text-slate-500">${new Date(a.timestamp).toLocaleString()}</td>
        <td class="font-bold">${a.user}</td>
        <td>${a.event}</td>
      </tr>
    `).join('');
    const el = document.getElementById('table-activity');
    if(el) el.innerHTML = html;
  },

  renderUsers() {
    const html = this.data.users.map(u => `
      <tr>
        <td class="font-bold">${u.name}</td>
        <td class="text-slate-600">${u.email}</td>
        <td><span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">${u.role}</span></td>
        <td><span class="status-badge status-green">${u.status}</span></td>
        <td><button class="text-red-600 font-bold hover:underline">Disable</button></td>
      </tr>
    `).join('');
    const el = document.getElementById('table-users');
    if(el) el.innerHTML = html;
  },

  renderTracking() {
    const dot = document.getElementById('sim-dot');
    if (!dot) return;
    let pos = 10;
    setInterval(() => {
      pos += 0.5;
      if (pos > 90) pos = 10;
      dot.style.left = pos + '%';
      dot.style.top = (pos/2 + 20) + '%';
    }, 1000);
  },

  startSimulations() {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.loadData();
        const active = document.querySelector('.admin-view.active');
        if (active) {
          const id = active.id.replace('view-', '');
          if (id !== 'tracking') this.renderView(id);
        }
      }
    }, 5000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});
