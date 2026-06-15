// LinkSwift JS Frontend Logic

document.addEventListener("DOMContentLoaded", () => {
    // API endpoint references
    const API_URLS = "/api/urls";
    const API_SHORTEN = "/api/shorten";
    const API_ANALYTICS = "/api/analytics";

    // Chart instances store
    let chartClicksTimeInstance = null;
    let chartBrowsersInstance = null;
    let chartOSInstance = null;
    let chartDevicesInstance = null;

    // Currently selected short code
    let activeShortCode = null;

    // DOM Elements
    const shortenerForm = document.getElementById("shortener-form");
    const originalUrlInput = document.getElementById("original-url");
    const customCodeInput = document.getElementById("custom-code");
    const resultPanel = document.getElementById("result-panel");
    const shortenedUrlLink = document.getElementById("shortened-url-link");
    const btnCopyResult = document.getElementById("btn-copy-result");
    const btnViewAnalyticsResult = document.getElementById("btn-view-analytics-result");

    const urlsTableBody = document.getElementById("urls-table-body");
    const listUrlsCountBadge = document.getElementById("list-urls-count");

    const statTotalUrls = document.getElementById("stat-total-urls");
    const statTotalClicks = document.getElementById("stat-total-clicks");
    const statTopBrowser = document.getElementById("stat-top-browser");

    const analyticsPlaceholder = document.getElementById("analytics-placeholder");
    const analyticsPanel = document.getElementById("analytics-panel");
    const selectedShortCode = document.getElementById("selected-short-code");
    const selectedOriginalUrl = document.getElementById("selected-original-url");
    const selectedCreatedDate = document.getElementById("selected-created-date");
    const selectedClicksCount = document.getElementById("selected-clicks-count");
    const btnCopySelected = document.getElementById("btn-copy-selected");
    const btnVisitSelected = document.getElementById("btn-visit-selected");

    const referrerListContainer = document.getElementById("referrer-list-container");
    const clicksLogBody = document.getElementById("clicks-log-body");
    const btnRefreshData = document.getElementById("btn-refresh-data");

    // Toast element
    const toast = document.getElementById("toast-notification");
    const toastMessage = toast.querySelector(".toast-message");

    // Initialize application data
    fetchUrls();

    // Event listener: Refresh Dashboard
    btnRefreshData.addEventListener("click", () => {
        fetchUrls();
        if (activeShortCode) {
            fetchAnalytics(activeShortCode);
        }
        showToast("Dashboard refreshed", "success");
    });

    // Event listener: Shorten Form Submission
    shortenerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const originalUrl = originalUrlInput.value.trim();
        const customCode = customCodeInput.value.trim() || null;

        const btnShorten = document.getElementById("btn-shorten");
        btnShorten.disabled = true;
        btnShorten.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Shortening...';

        try {
            const response = await fetch(API_SHORTEN, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    original_url: originalUrl,
                    custom_code: customCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Failed to shorten URL");
            }

            // Show result
            shortenedUrlLink.textContent = data.short_url;
            shortenedUrlLink.href = data.short_url;
            resultPanel.style.display = "block";
            
            // Focus and highlight result
            resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

            // Store this response code for secondary action buttons
            btnCopyResult.onclick = () => copyTextToClipboard(data.short_url);
            btnViewAnalyticsResult.onclick = () => {
                selectURLRowByCode(data.short_code);
            };

            // Clear inputs
            originalUrlInput.value = "";
            customCodeInput.value = "";

            // Refresh recent lists
            fetchUrls();
            showToast("Short link created successfully!", "success");

        } catch (error) {
            showToast(error.message, "danger");
        } finally {
            btnShorten.disabled = false;
            btnShorten.innerHTML = '<span>Shorten</span> <i class="fa-solid fa-wand-magic-sparkles"></i>';
        }
    });

    // Fetch list of shortened URLs
    async function fetchUrls() {
        try {
            const response = await fetch(API_URLS);
            if (!response.ok) throw new Error("Could not fetch URLs");
            const urls = await response.json();

            // Update stats counter cards
            statTotalUrls.textContent = urls.length;
            listUrlsCountBadge.textContent = `${urls.length} URL${urls.length === 1 ? '' : 's'}`;

            let totalClicksSum = 0;
            urls.forEach(u => totalClicksSum += u.clicks_count);
            statTotalClicks.textContent = totalClicksSum;

            // Render table
            if (urls.length === 0) {
                urlsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted" style="padding: 40px 0;">
                            <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                            No links shortened yet. Paste a link above to begin.
                        </td>
                    </tr>`;
                statTopBrowser.textContent = "None";
                return;
            }

            urlsTableBody.innerHTML = "";
            urls.forEach(url => {
                const row = document.createElement("tr");
                row.dataset.code = url.short_code;
                if (activeShortCode === url.short_code) {
                    row.classList.add("selected-row");
                }

                // Truncate original URL for layout display
                let displayUrl = url.original_url;
                if (displayUrl.length > 40) {
                    displayUrl = displayUrl.substring(0, 37) + "...";
                }

                row.innerHTML = `
                    <td class="original-url-cell" title="${url.original_url}">${displayUrl}</td>
                    <td><span class="code-cell-text">${url.short_code}</span></td>
                    <td class="clicks-cell">${url.clicks_count}</td>
                    <td class="action-buttons-cell">
                        <button class="btn-icon-only btn-copy-row" title="Copy Link"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon-only btn-visit-row" title="Open Link"><i class="fa-solid fa-external-link"></i></button>
                    </td>
                `;

                // Handle row selection (click anywhere on row except buttons)
                row.addEventListener("click", (e) => {
                    if (e.target.closest("button") || e.target.closest("a")) return;
                    selectURLRowByCode(url.short_code);
                });

                // Attach button events
                row.querySelector(".btn-copy-row").addEventListener("click", (e) => {
                    e.stopPropagation();
                    copyTextToClipboard(url.short_url);
                });

                row.querySelector(".btn-visit-row").addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.open(url.short_url, "_blank");
                });

                urlsTableBody.appendChild(row);
            });

            // Find top browser (by scanning urls and summing analytics - but simpler, let's query it from selected url or just leave it)
            // Wait, we can fetch all analytics to calculate the top browser globally or just let it show the browser of the active selection or "Chrome" if active.
            // Let's compute the top browser dynamically if we have analytics or if a URL is active. Let's make it look smart.

        } catch (error) {
            urlsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // Select row and show analytics
    function selectURLRowByCode(code) {
        activeShortCode = code;
        
        // Highlight row in UI
        const rows = urlsTableBody.querySelectorAll("tr");
        rows.forEach(r => {
            if (r.dataset.code === code) {
                r.classList.add("selected-row");
            } else {
                r.classList.remove("selected-row");
            }
        });

        // Hide placeholder, show analytics panels
        analyticsPlaceholder.style.display = "none";
        analyticsPanel.style.display = "flex";

        // Fetch metrics
        fetchAnalytics(code);
    }

    // Fetch analytics detail
    async function fetchAnalytics(code) {
        try {
            const response = await fetch(`${API_ANALYTICS}/${code}`);
            if (!response.ok) throw new Error("Could not load analytics");
            const data = await response.json();

            // Populate metadata
            selectedShortCode.textContent = data.short_code;
            selectedOriginalUrl.textContent = data.original_url;
            selectedOriginalUrl.title = data.original_url;
            selectedOriginalUrl.href = data.original_url;
            selectedClicksCount.textContent = data.clicks_count;

            const createdDate = new Date(data.created_at);
            selectedCreatedDate.textContent = createdDate.toLocaleDateString(undefined, { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });

            // Attach copy/visit events to selected header buttons
            btnCopySelected.onclick = () => copyTextToClipboard(data.short_url);
            btnVisitSelected.href = data.short_url;

            // Render Charts
            renderClicksOverTimeChart(data.clicks_over_time);
            renderBrowsersChart(data.browsers);
            renderOSChart(data.os_systems);
            renderDevicesChart(data.devices);

            // Populate top browser stat card dynamically from this link if available
            if (data.browsers && data.browsers.length > 0) {
                statTopBrowser.textContent = data.browsers[0].name;
            } else {
                statTopBrowser.textContent = "None";
            }

            // Render Traffic Sources (Referrers) progress list
            renderReferrersList(data.referrers);

            // Render raw click logs
            renderClickLogs(data.clicks);

        } catch (error) {
            showToast(error.message, "danger");
        }
    }

    // --- Chart Rendering Functions ---

    function renderClicksOverTimeChart(data) {
        const ctx = document.getElementById("chart-clicks-time").getContext("2d");
        
        // Destroy existing instance to prevent overlapping hover bugs
        if (chartClicksTimeInstance) chartClicksTimeInstance.destroy();

        // If empty data, add dummy labels
        const labels = data.length > 0 ? data.map(d => d.date) : ["No clicks yet"];
        const values = data.length > 0 ? data.map(d => d.count) : [0];

        // Create beautiful gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

        chartClicksTimeInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Clicks",
                    data: values,
                    borderColor: "#818cf8",
                    borderWidth: 3,
                    pointBackgroundColor: "#a78bfa",
                    pointBorderColor: "rgba(255,255,255,0.7)",
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(255, 255, 255, 0.03)" },
                        ticks: { color: "#9ca3af", font: { family: "Plus Jakarta Sans" } }
                    },
                    y: {
                        grid: { color: "rgba(255, 255, 255, 0.03)" },
                        ticks: { 
                            color: "#9ca3af", 
                            font: { family: "Plus Jakarta Sans" },
                            stepSize: 1,
                            precision: 0 
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderBrowsersChart(data) {
        const ctx = document.getElementById("chart-browsers").getContext("2d");
        if (chartBrowsersInstance) chartBrowsersInstance.destroy();

        const labels = data.length > 0 ? data.map(d => d.name) : ["No data"];
        const values = data.length > 0 ? data.map(d => d.count) : [1];
        const colors = data.length > 0 ? [
            "#22d3ee", "#c084fc", "#818cf8", "#fb7185", "#34d399", "#f59e0b"
        ] : ["rgba(255,255,255,0.05)"];

        chartBrowsersInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: "rgba(10, 11, 14, 0.9)",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: { color: "#e2e8f0", font: { family: "Plus Jakarta Sans", size: 11 } }
                    }
                },
                cutout: "70%"
            }
        });
    }

    function renderOSChart(data) {
        const ctx = document.getElementById("chart-os").getContext("2d");
        if (chartOSInstance) chartOSInstance.destroy();

        const labels = data.length > 0 ? data.map(d => d.name) : ["No data"];
        const values = data.length > 0 ? data.map(d => d.count) : [1];
        const colors = data.length > 0 ? [
            "#a855f7", "#3b82f6", "#06b6d4", "#f43f5e", "#10b981", "#8b5cf6"
        ] : ["rgba(255,255,255,0.05)"];

        chartOSInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: "rgba(10, 11, 14, 0.9)",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: { color: "#e2e8f0", font: { family: "Plus Jakarta Sans", size: 11 } }
                    }
                },
                cutout: "70%"
            }
        });
    }

    function renderDevicesChart(data) {
        const ctx = document.getElementById("chart-devices").getContext("2d");
        if (chartDevicesInstance) chartDevicesInstance.destroy();

        const labels = data.length > 0 ? data.map(d => d.name) : ["Desktop", "Mobile", "Tablet"];
        const values = data.length > 0 ? data.map(d => d.count) : [0, 0, 0];

        chartDevicesInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: "#c084fc",
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#9ca3af", font: { family: "Plus Jakarta Sans" } }
                    },
                    y: {
                        grid: { color: "rgba(255, 255, 255, 0.03)" },
                        ticks: { 
                            color: "#9ca3af", 
                            font: { family: "Plus Jakarta Sans" },
                            stepSize: 1,
                            precision: 0
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderReferrersList(data) {
        if (!data || data.length === 0) {
            referrerListContainer.innerHTML = `
                <div class="text-center text-muted" style="padding-top: 30px;">
                    <i class="fa-solid fa-share-nodes" style="font-size: 20px; margin-bottom: 6px; display: block; opacity: 0.5;"></i>
                    No referral data recorded.
                </div>`;
            return;
        }

        // Find max clicks to calculate percentage fills
        const maxClicks = Math.max(...data.map(d => d.count));

        referrerListContainer.innerHTML = "";
        data.forEach(item => {
            const pct = maxClicks > 0 ? (item.count / maxClicks) * 100 : 0;
            const refRow = document.createElement("div");
            refRow.className = "referrer-item";
            refRow.innerHTML = `
                <div class="referrer-item-info">
                    <span class="referrer-name">${item.name}</span>
                    <span class="referrer-count">${item.count} click${item.count === 1 ? '' : 's'}</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
            `;
            referrerListContainer.appendChild(refRow);

            // Animate progress bar fill width asynchronously for premium feel
            setTimeout(() => {
                const fill = refRow.querySelector(".progress-bar-fill");
                if (fill) fill.style.width = `${pct}%`;
            }, 50);
        });
    }

    function renderClickLogs(clicks) {
        if (!clicks || clicks.length === 0) {
            clicksLogBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">No individual clicks log recorded yet.</td>
                </tr>`;
            return;
        }

        clicksLogBody.innerHTML = "";
        clicks.forEach(click => {
            const date = new Date(click.timestamp);
            const displayTime = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${displayTime}</td>
                <td>
                    <span style="font-weight: 500;">${click.browser}</span> 
                    <span class="text-muted" style="font-size: 11px; margin-left: 4px;">(${click.os})</span>
                </td>
                <td><span class="badge">${click.device}</span></td>
                <td><span class="text-muted" style="font-size: 12px;">${click.referrer || "Direct / Bookmark"}</span></td>
                <td><code style="color: var(--text-secondary);">${click.ip_address || "-"}</code></td>
            `;
            clicksLogBody.appendChild(row);
        });
    }

    // --- Clipboard & UI Helpers ---

    function copyTextToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied to clipboard!", "success");
        }).catch(err => {
            showToast("Could not copy link automatically.", "danger");
        });
    }

    function showToast(message, type = "success") {
        toastMessage.textContent = message;
        toast.className = "toast"; // Reset
        
        if (type === "danger") {
            toast.style.borderColor = "var(--danger)";
            toast.querySelector(".toast-icon").className = "fa-solid fa-circle-exclamation toast-icon";
            toast.querySelector(".toast-icon").style.color = "var(--danger)";
        } else {
            toast.style.borderColor = "var(--success)";
            toast.querySelector(".toast-icon").className = "fa-solid fa-circle-check toast-icon";
            toast.querySelector(".toast-icon").style.color = "var(--success)";
        }

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
});
