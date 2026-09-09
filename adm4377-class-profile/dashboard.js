(() => {
  const cfg = window.ADM4377_CONFIG;
  const keyInput = document.getElementById('dashboardKey');
  const refreshButton = document.getElementById('refreshButton');
  const demoButton = document.getElementById('demoButton');
  const statusEl = document.getElementById('dashboardStatus');
  const generatedAtEl = document.getElementById('generatedAt');

  const sessionKey = `adm4377-dashboard-key-${cfg?.sessionId || 'default'}`;
  keyInput.value = sessionStorage.getItem(sessionKey) || '';

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(`panel-${button.dataset.panel}`).classList.add('active');
    });
  });

  refreshButton.addEventListener('click', loadFromAppsScript);
  demoButton.addEventListener('click', () => renderDashboard(makeDemoData()));

  function loadFromAppsScript() {
    if (!cfg || !cfg.appsScriptUrl || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(cfg.appsScriptUrl)) {
      setStatus('Apps Script is not configured yet. Use Demo Data, or paste the /exec URL into config.js.', true);
      return;
    }

    const dashboardKey = keyInput.value.trim();
    if (!dashboardKey) {
      setStatus('Enter the dashboard key you set in Code.gs.', true);
      keyInput.focus();
      return;
    }

    sessionStorage.setItem(sessionKey, dashboardKey);
    setStatus('Loading results…');
    refreshButton.disabled = true;

    const callbackName = `adm4377Callback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const url = new URL(cfg.appsScriptUrl);
    url.searchParams.set('action', 'dashboard');
    url.searchParams.set('session', cfg.sessionId);
    url.searchParams.set('dashboardKey', dashboardKey);
    url.searchParams.set('prefix', callbackName);
    url.searchParams.set('_', Date.now());

    let settled = false;
    const cleanup = () => {
      if (window[callbackName]) delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      refreshButton.disabled = false;
    };

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      setStatus('The dashboard request timed out. Check the Apps Script URL, deployment access, and dashboard key.', true);
    }, 20000);

    window[callbackName] = payload => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      if (!payload || payload.ok !== true) {
        setStatus(payload?.message || 'Apps Script returned an error.', true);
        return;
      }
      renderDashboard(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      setStatus('Could not reach the Apps Script dashboard endpoint. Verify that the deployment is accessible to anyone with the web app URL.', true);
    };

    script.src = url.toString();
    document.body.appendChild(script);
  }

  function renderDashboard(data) {
    document.getElementById('summaryResponses').textContent = data.n ?? 0;
    document.getElementById('summaryPrimary').textContent = data.summary?.topPrimary || '—';
    document.getElementById('summaryBarrier').textContent = data.summary?.topBarrier || '—';
    document.getElementById('summaryConfidence').textContent = data.summary?.avgConfidence != null ? `${Number(data.summary.avgConfidence).toFixed(2)} / 5` : '—';

    const chartIds = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q13','q14'];
    chartIds.forEach(id => renderBarChart(`chart-${id}`, data.charts?.[id]));
    renderBarChart('chart-overview-q9', data.charts?.q9);
    renderBarChart('chart-overview-q10', data.charts?.q10);
    renderBarChart('chart-overview-q12', data.charts?.q12);

    renderOpenResponses(data.openResponses || []);

    const generatedAt = data.generatedAt ? new Date(data.generatedAt) : new Date();
    generatedAtEl.textContent = `Dashboard generated ${generatedAt.toLocaleString()} · Session: ${data.session || cfg.sessionId}${data.version ? ` · Service ${data.version}` : ''}`;
    setStatus(`Loaded ${data.n || 0} responses.`);
  }

  function renderBarChart(containerId, chart) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!chart || !Array.isArray(chart.values) || chart.values.length === 0) {
      container.innerHTML = '<div class="empty-state">No responses yet.</div>';
      return;
    }

    const max = Math.max(1, ...chart.values.map(item => Number(item.count) || 0));
    container.innerHTML = `
      <div class="bar-list">
        ${chart.values.map(item => {
          const width = ((Number(item.count) || 0) / max) * 100;
          const pct = item.pct == null ? '' : `${Number(item.pct).toFixed(0)}%`;
          return `
            <div class="bar-row">
              <div class="bar-label">${escapeHTML(item.label)}</div>
              <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${width.toFixed(1)}%"></div></div>
              <div class="bar-value">${item.count} ${pct ? `· ${pct}` : ''}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderOpenResponses(items) {
    const container = document.getElementById('openResponses');
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">No optional open responses were submitted.</div>';
      return;
    }
    container.innerHTML = items.map((text, index) => `
      <article class="open-response">
        <div class="response-number">RESPONSE ${index + 1}</div>
        <p>${escapeHTML(text)}</p>
      </article>`).join('');
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#8a1c1c' : '';
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function makeDemoData() {
    const n = 42;
    const mk = pairs => ({ values: pairs.map(([label, count]) => ({ label, count, pct: count / n * 100 })) });
    return {
      ok: true,
      session: `${cfg?.sessionId || 'ADM4377'} (DEMO)`,
      generatedAt: new Date().toISOString(),
      n,
      summary: {
        topPrimary: 'Business Technology Management',
        topBarrier: 'Organizational culture',
        avgConfidence: 3.1
      },
      charts: {
        q1: mk([['Business Technology Management',36],['Business Analytics',3],['Finance',2],['Other',1]]),
        q2: mk([['None',17],['Finance',7],['Microprogram: Management Consulting',6],['Business Analytics',5],['Minor outside Telfer',4],['Microprogram: Capital Markets',3]]),
        q3: mk([['4th year',34],['5th year or beyond',5],['3rd year',3]]),
        q4: mk([['Consulting',11],['Technology / IT',10],['Analytics / Data',8],['Public sector / Government',5],['Finance / Accounting',4],['Not sure yet',4]]),
        q5: mk([['Co-op',29],['Summer employment',25],['Part-time employment',22],['Internship',16],['Full-time employment',8],['Entrepreneurship / self-employment',4]]),
        q6: mk([['None',2],['Less than 6 months',4],['6 to 12 months',9],['1 to 2 years',15],['2 to 3 years',8],['More than 3 years',4]]),
        q7: mk([['Government / Public sector',17],['Technology',13],['Financial services',10],['Professional services / Consulting',8],['Retail / Consumer',7],['Education',5]]),
        q8: mk([['Technology / IT',20],['Data / Analytics',18],['Project management',16],['Operations',12],['Consulting / Advisory',10],['Finance / Accounting',9]]),
        q9: mk([['IT mainly provides technical support',7],['Business tells IT what systems it needs',8],['Business and IT consult each other regularly',12],['Business and technology jointly develop priorities',9],['Technology is deeply involved in shaping business strategy',4],['I do not have enough workplace experience to answer',2]]),
        q10: mk([['Strongly disagree',6],['Disagree',15],['Neutral / unsure',8],['Agree',10],['Strongly agree',3]]),
        q11: mk([['Organizational culture',12],['Resistance to change',8],['Skills and capabilities',7],['Leadership',5],['Legacy technology',4],['Business-IT alignment',3],['Other',3]]),
        q12: mk([['Employee skills and training',10],['AI / automation',8],['Data and analytics',7],['Process redesign',6],['Cybersecurity',5],['Governance and leadership',4],['New technology',2]]),
        q13: mk([['Artificial intelligence',24],['Cybersecurity',6],['Data and analytics',5],['Automation / robotics',3],['Cloud platforms',2],['Digital platforms',2]]),
        q14: mk([['1',2],['2',6],['3',17],['4',13],['5',4]])
      },
      openResponses: [
        'A workflow tool reduced a repetitive approval process from several emails to one shared status view.',
        'Our team adopted an AI assistant quickly, but people used it very differently and there were no clear norms at first.',
        'A customer system had lots of data, but employees still relied on spreadsheets because the reports were hard to use.'
      ]
    };
  }
})();
