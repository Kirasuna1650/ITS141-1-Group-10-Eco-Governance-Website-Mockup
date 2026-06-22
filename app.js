// Eco-Governance Dashboard Javascript Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    lucide.createIcons();

    // 2. Mock LGU baseline database
    let lguDatabase = {
        'manila': {
            name: 'Manila City',
            coords: [14.5995, 120.9842],
            aqi: 92,
            co2: 425,
            pm25: 31.2,
            temp: '32°C',
            humidity: '75%',
            compliance: 'Passed',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: false },
            healthAdvisory: 'Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution. Active children and adults, and people with respiratory disease, should limit prolonged outdoor exertion.'
        },
        'quezon-city': {
            name: 'Quezon City',
            coords: [14.6760, 121.0437],
            aqi: 84,
            co2: 412,
            pm25: 27.5,
            temp: '31°C',
            humidity: '72%',
            compliance: 'Passed',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: true },
            healthAdvisory: 'Moderate air pollution levels. General public can engage in standard outdoor activities. Sensitive groups should monitor for symptoms like coughing or shortness of breath and adjust physical exertions accordingly.'
        },
        'makati': {
            name: 'Makati City',
            coords: [14.5547, 121.0244],
            aqi: 48,
            co2: 395,
            pm25: 11.2,
            temp: '32°C',
            humidity: '70%',
            compliance: 'Passed',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: true },
            healthAdvisory: 'Air quality is considered satisfactory, and air pollution poses little or no risk. Enjoy your outdoor physical activities! Excellent conditions for sports, walking, and outdoor recreation.'
        },
        'taguig': {
            name: 'Taguig City',
            coords: [14.5176, 121.0509],
            aqi: 56,
            co2: 401,
            pm25: 15.8,
            temp: '31°C',
            humidity: '74%',
            compliance: 'Passed',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: true },
            healthAdvisory: 'Air quality is acceptable. Only highly sensitive groups might feel light respiratory discomfort. Standard outdoor exercises and municipal gatherings are recommended.'
        },
        'pasig': {
            name: 'Pasig City',
            coords: [14.5764, 121.0851],
            aqi: 96,
            co2: 430,
            pm25: 33.4,
            temp: '31°C',
            humidity: '76%',
            compliance: 'Warning',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: false },
            healthAdvisory: 'Acceptable AQI close to unhealthy limits. Rising particulates from surrounding logistics routes. High risk groups are advised to take breaks during heavy traffic periods.'
        },
        'caloocan': {
            name: 'Caloocan City',
            coords: [14.6416, 120.9762],
            aqi: 115,
            co2: 448,
            pm25: 41.5,
            temp: '33°C',
            humidity: '73%',
            compliance: 'Under Review',
            checklists: { actionPlan: false, stationOnline: true, vehicleIndex: false },
            healthAdvisory: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected. Asthmatics and children should reduce heavy outdoor work, and shift events indoors.'
        },
        'mandaluyong': {
            name: 'Mandaluyong City',
            coords: [14.5794, 121.0359],
            aqi: 72,
            co2: 408,
            pm25: 21.9,
            temp: '31°C',
            humidity: '73%',
            compliance: 'Passed',
            checklists: { actionPlan: true, stationOnline: true, vehicleIndex: true },
            healthAdvisory: 'Standard moderate rating. No general restrictions are in place. Safe environment for urban commuting and business parks.'
        }
    };

    // Keep dynamic working copy of the database to support live simulation scenarios
    let currentData = JSON.parse(JSON.stringify(lguDatabase));
    let activeFocusLGU = 'manila';
    let activeMetric = 'aqi'; // aqi, co2, pm25

    // 3. Initialize Leaflet Map
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([14.5995, 121.03], 11.5);

    // Dark-mode themed tile set (CartoDB Positron)
    const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Zoom controls customized placement
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    let mapMarkers = {};
    let mapCircles = [];

    // Helper to get status colors
    function getStatusColor(aqi) {
        if (aqi <= 50) return '#10b981'; // Good (Emerald)
        if (aqi <= 100) return '#f97316'; // Moderate (Orange)
        if (aqi <= 150) return '#f59e0b'; // Unhealthy Sensitive (Amber)
        if (aqi <= 200) return '#f43f5e'; // Unhealthy (Rose)
        return '#8b5cf6'; // Hazardous (Purple)
    }

    function getStatusName(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy-S';
        if (aqi <= 200) return 'Unhealthy';
        return 'Hazardous';
    }

    function getStatusBadgeClass(aqi) {
        if (aqi <= 50) return 'badge-success';
        if (aqi <= 100) return 'badge-warning';
        if (aqi <= 150) return 'badge-warning';
        if (aqi <= 200) return 'badge-danger';
        return 'badge-purple';
    }

    // Render map markers and simulated heat overlay circles
    function updateMapLayer() {
        // Clear previous overlays
        mapCircles.forEach(circle => map.removeLayer(circle));
        mapCircles = [];

        Object.keys(currentData).forEach(key => {
            const lgu = currentData[key];
            const color = getStatusColor(lgu.aqi);
            
            // Draw Heat radius
            let valueFactor = activeMetric === 'aqi' ? lgu.aqi : (activeMetric === 'co2' ? (lgu.co2 - 380) * 3 : lgu.pm25 * 3);
            let radius = Math.max(1000, valueFactor * 12);
            
            const circle = L.circle(lgu.coords, {
                color: color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 1,
                radius: radius
            }).addTo(map);

            circle.on('click', () => {
                focusOnLGU(key);
            });

            // Bind high fidelity popups
            circle.bindTooltip(`<strong>${lgu.name}</strong><br/>AQI: ${lgu.aqi} (${getStatusName(lgu.aqi)})<br/>CO2: ${lgu.co2} ppm`, {
                permanent: false,
                direction: 'top',
                className: 'custom-map-tooltip'
            });

            mapCircles.push(circle);

            // Small solid inner pulse dot representation
            const markerCircle = L.circleMarker(lgu.coords, {
                radius: 8,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.9
            }).addTo(map);

            markerCircle.on('click', () => {
                focusOnLGU(key);
            });

            mapCircles.push(markerCircle);
        });
    }

    // 4. Initialize Chart.js Trend Canvas
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    // Generate simulated baseline dataset trends
    function getChartLabels(mode) {
        if (mode === '24h') {
            return ['12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
        } else {
            return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        }
    }

    function getChartData(mode, scenario, type) {
        // baseline curves
        if (mode === '24h') {
            if (type === 'aqi') {
                let base = [65, 58, 52, 68, 98, 105, 92, 85, 95, 112, 88, 72]; // traffic rush peaks at 8AM, 6PM
                if (scenario === 'rush-hour') {
                    return base.map(v => Math.round(v * 1.35));
                }
                if (scenario === 'industrial') {
                    return base.map((v, i) => Math.round(v * (i >= 4 && i <= 9 ? 1.4 : 1.1)));
                }
                if (scenario === 'rain') {
                    return base.map(v => Math.round(v * 0.45));
                }
                return base;
            } else { // CO2
                let base = [398, 396, 395, 402, 420, 428, 415, 410, 418, 432, 412, 404];
                if (scenario === 'rush-hour') {
                    return base.map(v => Math.round(v + (v - 390) * 0.8));
                }
                if (scenario === 'industrial') {
                    return base.map(v => Math.round(v + 25));
                }
                if (scenario === 'rain') {
                    return base.map(v => Math.round(385 + (v - 385) * 0.2));
                }
                return base;
            }
        } else { // 7 Days
            if (type === 'aqi') {
                let base = [82, 88, 91, 84, 89, 72, 65]; // weekends lower traffic
                if (scenario === 'rush-hour') return base.map(v => Math.round(v * 1.25));
                if (scenario === 'industrial') return base.map(v => Math.round(v * 1.15));
                if (scenario === 'rain') return base.map(v => Math.round(v * 0.4));
                return base;
            } else {
                let base = [412, 415, 418, 411, 414, 405, 399];
                if (scenario === 'rush-hour') return base.map(v => v + 18);
                if (scenario === 'industrial') return base.map(v => v + 22);
                if (scenario === 'rain') return base.map(v => Math.round(388 + (v - 388) * 0.3));
                return base;
            }
        }
    }

    let activeChartMode = '24h'; // 24h, 7d
    let activeScenario = 'normal';

    const trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getChartLabels(activeChartMode),
            datasets: [
                {
                    label: 'AQI Level',
                    data: getChartData(activeChartMode, activeScenario, 'aqi'),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Carbon (CO2 ppm)',
                    data: getChartData(activeChartMode, activeScenario, 'co2'),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'rgba(255,255,255,0.7)',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: { size: 10 }
                    }
                },
                y: {
                    position: 'left',
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: { size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'Air Quality Index',
                        color: '#f97316',
                        font: { size: 11, weight: 'bold' }
                    }
                },
                y1: {
                    position: 'right',
                    grid: {
                        drawOnChartArea: false // prevent overlay grids
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: { size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'CO2 levels (ppm)',
                        color: '#10b981',
                        font: { size: 11, weight: 'bold' }
                    }
                }
            }
        }
    });

    // Function to rebuild/recolor chart elements dynamically on theme switch
    function updateChartColors(theme) {
        const isDark = theme === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
        const legendColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';

        trendsChart.options.scales.x.grid.color = gridColor;
        trendsChart.options.scales.y.grid.color = gridColor;
        trendsChart.options.scales.x.ticks.color = textColor;
        trendsChart.options.scales.y.ticks.color = textColor;
        trendsChart.options.scales.y1.ticks.color = textColor;
        trendsChart.options.plugins.legend.labels.color = legendColor;
        trendsChart.update();
    }

    // 5. Update Focus LGU panel detail values
    function focusOnLGU(key) {
        activeFocusLGU = key;
        const lgu = currentData[key];
        if (!lgu) return;

        // Center map to marker
        map.panTo(lgu.coords);

        // Update Text Fields
        document.getElementById('focus-lgu-name').innerText = lgu.name;
        document.getElementById('focus-co2').innerText = `${lgu.co2} ppm`;
        document.getElementById('focus-pm25').innerText = `${lgu.pm25} µg/m³`;
        document.getElementById('focus-health-desc').innerText = lgu.healthAdvisory;

        // Circular Gauge update
        const statusBadge = document.getElementById('focus-lgu-status');
        statusBadge.innerText = getStatusName(lgu.aqi);
        statusBadge.className = `stat-badge ${getStatusBadgeClass(lgu.aqi)}`;

        const circularChart = document.querySelector('.circular-chart');
        circularChart.className = `circular-chart text-${activeMetric === 'aqi' ? getMetricColorName(lgu.aqi) : 'emerald'}`;

        const gaugeValue = document.getElementById('gauge-value');
        const gaugeCircle = document.getElementById('gauge-circle');

        if (activeMetric === 'aqi') {
            gaugeValue.innerText = lgu.aqi;
            document.querySelector('.percentage-unit').innerText = 'AQI';
            // Calculate dash offset: (100 - percent) or map to circle stroke length (251.2 total circumference approx)
            let percent = Math.min(100, Math.round((lgu.aqi / 220) * 100)); // Cap values
            gaugeCircle.setAttribute('stroke-dasharray', `${percent}, 100`);
        } else if (activeMetric === 'co2') {
            gaugeValue.innerText = lgu.co2;
            document.querySelector('.percentage-unit').innerText = 'ppm';
            let percent = Math.min(100, Math.round(((lgu.co2 - 350) / 150) * 100)); // normalized 350 to 500
            gaugeCircle.setAttribute('stroke-dasharray', `${percent}, 100`);
        } else {
            gaugeValue.innerText = Math.round(lgu.pm25);
            document.querySelector('.percentage-unit').innerText = 'µg/m³';
            let percent = Math.min(100, Math.round((lgu.pm25 / 60) * 100)); // normalized
            gaugeCircle.setAttribute('stroke-dasharray', `${percent}, 100`);
        }

        // Compliance check items
        const checkList = document.querySelector('.compliance-checklist');
        const items = checkList.querySelectorAll('li');
        
        items[0].className = lgu.checklists.actionPlan ? 'checked' : 'unchecked';
        items[0].querySelector('i').setAttribute('data-lucide', lgu.checklists.actionPlan ? 'check-circle-2' : 'alert-circle');
        
        items[1].className = lgu.checklists.stationOnline ? 'checked' : 'unchecked';
        items[1].querySelector('i').setAttribute('data-lucide', lgu.checklists.stationOnline ? 'check-circle-2' : 'alert-circle');

        items[2].className = lgu.checklists.vehicleIndex ? 'checked' : 'unchecked';
        items[2].querySelector('i').setAttribute('data-lucide', lgu.checklists.vehicleIndex ? 'check-circle-2' : 'alert-circle');

        lucide.createIcons();

        // Highlight selected row in table
        const rows = document.querySelectorAll('#lgu-table-body tr');
        rows.forEach(row => {
            if (row.getAttribute('data-lgu-key') === key) {
                row.classList.add('active-row-highlight');
                row.style.background = 'rgba(16, 185, 129, 0.08)';
            } else {
                row.classList.remove('active-row-highlight');
                row.style.background = '';
            }
        });
    }

    function getMetricColorName(aqi) {
        if (aqi <= 50) return 'emerald';
        if (aqi <= 100) return 'orange';
        if (aqi <= 150) return 'orange';
        if (aqi <= 200) return 'rose';
        return 'purple';
    }

    // 6. Populate Table dynamically
    function populateLguTable() {
        const body = document.getElementById('lgu-table-body');
        body.innerHTML = '';

        Object.keys(currentData).forEach(key => {
            const lgu = currentData[key];
            const color = getStatusColor(lgu.aqi);
            const row = document.createElement('tr');
            row.setAttribute('data-lgu-key', key);

            if (key === activeFocusLGU) {
                row.classList.add('active-row-highlight');
                row.style.background = 'rgba(16, 185, 129, 0.08)';
            }

            row.innerHTML = `
                <td><strong>${lgu.name}</strong></td>
                <td><span class="status-dot" style="background-color: ${color}"></span>${lgu.aqi}</td>
                <td>${lgu.co2} ppm</td>
                <td><span class="stat-badge ${getStatusBadgeClass(lgu.aqi)}">${getStatusName(lgu.aqi)}</span></td>
                <td><span class="compliance-badge ${lgu.compliance === 'Passed' ? 'badge-success' : (lgu.compliance === 'Warning' ? 'badge-warning' : 'badge-danger')}">${lgu.compliance}</span></td>
                <td><button class="action-btn-mini">Inspect</button></td>
            `;

            row.addEventListener('click', () => {
                focusOnLGU(key);
            });

            body.appendChild(row);
        });
    }

    // 7. Calculate Global Metro Manila stats row
    function updateGlobalStats() {
        let totalAqi = 0;
        let totalCo2 = 0;
        let count = 0;

        Object.keys(currentData).forEach(key => {
            totalAqi += currentData[key].aqi;
            totalCo2 += currentData[key].co2;
            count++;
        });

        const avgAqi = Math.round(totalAqi / count);
        const avgCo2 = Math.round(totalCo2 / count);

        // Update top cards
        document.getElementById('val-avg-aqi').innerText = avgAqi;
        const mainBadge = document.getElementById('lbl-avg-aqi');
        mainBadge.innerText = getStatusName(avgAqi);
        mainBadge.className = `stat-badge ${getStatusBadgeClass(avgAqi)}`;

        document.getElementById('val-avg-co2').innerHTML = `${avgCo2} <span class="unit">ppm</span>`;

        // Update active stations count
        let onlineCount = 0;
        Object.keys(currentData).forEach(key => {
            if (currentData[key].checklists.stationOnline) onlineCount++;
        });
        document.getElementById('val-stations').innerHTML = `${onlineCount} <span class="total">/ ${count}</span>`;

        // Update compliance rating percent
        let complianceCount = 0;
        Object.keys(currentData).forEach(key => {
            if (currentData[key].compliance === 'Passed') complianceCount++;
        });
        const rating = Math.round((complianceCount / count) * 100);
        document.getElementById('val-compliance').innerText = `${rating}%`;
    }

    // 8. Search filter logic
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let matchFound = false;

        Object.keys(currentData).forEach(key => {
            const name = currentData[key].name.toLowerCase();
            if (name.includes(query) && !matchFound) {
                focusOnLGU(key);
                matchFound = true;
            }
        });
    });

    // 9. Simulation scenario handlers
    const simPanelToggle = document.getElementById('simulation-panel-toggle');
    const simPanel = document.querySelector('.simulation-controller-panel');

    simPanelToggle.addEventListener('click', () => {
        simPanel.classList.toggle('collapsed');
    });

    const simButtons = document.querySelectorAll('.sim-btn');
    simButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            simButtons.forEach(b => b.classList.remove('active'));
            const currentBtn = e.currentTarget;
            currentBtn.classList.add('active');

            const eventType = currentBtn.getAttribute('data-event');
            triggerSimulationScenario(eventType);
        });
    });

    function triggerSimulationScenario(scenario) {
        activeScenario = scenario;
        const scenarioLabel = document.getElementById('sim-active-scenario');
        const scenarioDesc = document.getElementById('sim-active-desc');

        if (scenario === 'normal') {
            currentData = JSON.parse(JSON.stringify(lguDatabase));
            scenarioLabel.innerText = 'Standard Live Baseline';
            scenarioDesc.innerText = 'Displays standard localized monitoring values gathered across Manila and surrounding cities.';
        } 
        else if (scenario === 'rush-hour') {
            // Traffic increases AQI and CO2, especially in high congestion areas
            currentData = JSON.parse(JSON.stringify(lguDatabase));
            Object.keys(currentData).forEach(key => {
                if (['manila', 'quezon-city', 'pasig', 'caloocan'].includes(key)) {
                    currentData[key].aqi += 45;
                    currentData[key].co2 += 48;
                    currentData[key].pm25 += 18.5;
                    currentData[key].compliance = 'Warning';
                    currentData[key].checklists.vehicleIndex = false;
                } else {
                    currentData[key].aqi += 15;
                    currentData[key].co2 += 12;
                    currentData[key].pm25 += 5.2;
                }
            });
            scenarioLabel.innerText = 'Rush Hour Traffic Surge';
            scenarioDesc.innerText = 'Simulates high motor vehicle congestion, showing immediate spike in CO2 emissions and worsening AQI on major transit corridors.';
        }
        else if (scenario === 'industrial') {
            // Industrial nodes see massive spikes
            currentData = JSON.parse(JSON.stringify(lguDatabase));
            Object.keys(currentData).forEach(key => {
                if (['caloocan', 'pasig'].includes(key)) {
                    currentData[key].aqi = 175;
                    currentData[key].co2 = 512;
                    currentData[key].pm25 = 62.4;
                    currentData[key].compliance = 'Failed';
                    currentData[key].checklists.vehicleIndex = false;
                } else if (['makati', 'taguig'].includes(key)) {
                    // Makati green initiatives buffer the offset
                    currentData[key].aqi += 5;
                    currentData[key].co2 += 10;
                } else {
                    currentData[key].aqi += 20;
                    currentData[key].co2 += 18;
                }
            });
            scenarioLabel.innerText = 'Industrial Emission Spike';
            scenarioDesc.innerText = 'Simulates a factory operation surge in North Caloocan and Pasig sectors. Circle markers morph to dangerous red zones.';
        }
        else if (scenario === 'rain') {
            // Wet weather washes particulates, lowering AQI dramatically
            currentData = JSON.parse(JSON.stringify(lguDatabase));
            Object.keys(currentData).forEach(key => {
                currentData[key].aqi = Math.max(15, Math.round(lguDatabase[key].aqi * 0.35));
                currentData[key].co2 = Math.max(382, Math.round(lguDatabase[key].co2 * 0.94));
                currentData[key].pm25 = Math.round(lguDatabase[key].pm25 * 0.25);
                currentData[key].compliance = 'Passed';
                currentData[key].checklists.vehicleIndex = true;
            });
            scenarioLabel.innerText = 'Heavy Rain (Washout)';
            scenarioDesc.innerText = 'Simulates precipitation scrubbing particulates from the atmosphere. Air quality readings return to excellent green levels.';
        }

        // Apply changes
        updateMapLayer();
        populateLguTable();
        updateGlobalStats();
        focusOnLGU(activeFocusLGU);
        
        // Re-feed dataset values into Chart
        trendsChart.data.datasets[0].data = getChartData(activeChartMode, activeScenario, 'aqi');
        trendsChart.data.datasets[1].data = getChartData(activeChartMode, activeScenario, 'co2');
        trendsChart.update();
    }

    // 10. Switch Chart time window tab handlers
    const btn24h = document.getElementById('btn-chart-24h');
    const btn7d = document.getElementById('btn-chart-7d');

    if (btn24h && btn7d) {
        btn24h.addEventListener('click', () => {
            btn24h.classList.add('active');
            btn7d.classList.remove('active');
            activeChartMode = '24h';
            trendsChart.data.labels = getChartLabels('24h');
            trendsChart.data.datasets[0].data = getChartData('24h', activeScenario, 'aqi');
            trendsChart.data.datasets[1].data = getChartData('24h', activeScenario, 'co2');
            trendsChart.update();
        });

        btn7d.addEventListener('click', () => {
            btn7d.classList.add('active');
            btn24h.classList.remove('active');
            activeChartMode = '7d';
            trendsChart.data.labels = getChartLabels('7d');
            trendsChart.data.datasets[0].data = getChartData('7d', activeScenario, 'aqi');
            trendsChart.data.datasets[1].data = getChartData('7d', activeScenario, 'co2');
            trendsChart.update();
        });
    }

    // 11. Modal dialogue controllers (SDG goals click event)
    const sdgBtn = document.getElementById('btn-sdg');
    const sdgModal = document.getElementById('sdg-modal');
    const closeSdgBtn = document.getElementById('close-sdg-modal');
    const closeActionBtn = document.getElementById('btn-modal-close-action');

    if (sdgBtn && sdgModal) {
        sdgBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sdgModal.classList.add('active');
        });
    }

    [closeSdgBtn, closeActionBtn].forEach(el => {
        if (el && sdgModal) {
            el.addEventListener('click', () => {
                sdgModal.classList.remove('active');
            });
        }
    });

    // 12. Theme Switching Logic
    const darkToggle = document.getElementById('dark-theme-toggle');
    const lightToggle = document.getElementById('light-theme-toggle');

    if (darkToggle && lightToggle) {
        darkToggle.addEventListener('click', () => {
            if (!document.body.classList.contains('dark-theme')) {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
                darkToggle.classList.add('active');
                lightToggle.classList.remove('active');
                updateChartColors('dark');
            }
        });

        lightToggle.addEventListener('click', () => {
            if (!document.body.classList.contains('light-theme')) {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
                lightToggle.classList.add('active');
                darkToggle.classList.remove('active');
                updateChartColors('light');
            }
        });
    }

    // 13. Map Metric Type Select change handler
    const mapMetricSelect = document.getElementById('map-metric-select');
    if (mapMetricSelect) {
        mapMetricSelect.addEventListener('change', (e) => {
            activeMetric = e.target.value;
            updateMapLayer();
            focusOnLGU(activeFocusLGU);
        });
    }

    // Export PDF dummy trigger
    const exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            alert('Eco-Governance Compliance System:\nDraft Report for Metro Manila Clean Air Compliance Registry generated successfully. Saved draft to system buffer.');
        });
    }

    // 14. Initial Render cycle
    updateMapLayer();
    populateLguTable();
    updateGlobalStats();
    focusOnLGU(activeFocusLGU);

    // Initial chart refresh colors based on current body theme
    const initialTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    updateChartColors(initialTheme);
});
