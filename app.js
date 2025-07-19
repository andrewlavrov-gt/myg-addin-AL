// The entire add-in is wrapped in this 'initialize' function
geotab.addin.initialize(function (api, state) {
    
    // DOM Elements
    const ruleFilter = document.getElementById('rule-filter');
    const assetFilter = document.getElementById('asset-filter');
    const resultsBody = document.getElementById('results-body');
    const loader = document.getElementById('loader');

    // Global state to hold fetched data
    let allRules = [];
    let allAssets = [];

    /**
     * Helper function to format duration from seconds to HH:MM:SS
     */
    const formatDuration = (ticks) => {
        if (!ticks) return 'N/A';
        const totalSeconds = ticks / 10000000; // Ticks are 100-nanosecond intervals
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return [hours, minutes, seconds]
            .map(v => v < 10 ? "0" + v : v)
            .join(":");
    };

    /**
     * Main function to fetch exceptions and display them
     */
    const fetchAndDisplayExceptions = () => {
        loader.style.display = 'block';
        resultsBody.innerHTML = ''; // Clear previous results

        // Calculate 'from' and 'to' dates for the entire previous day
        const toDate = new Date();
        toDate.setHours(0, 0, 0, 0); // Midnight today
        const fromDate = new Date(toDate.getTime() - (24 * 60 * 60 * 1000)); // Midnight yesterday

        // Build the search object for the API call
        const search = {
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
        };

        // Add filters if they are selected
        if (ruleFilter.value) {
            search.ruleId = ruleFilter.value;
        }
        if (assetFilter.value) {
            search.deviceId = assetFilter.value;
        }

        // The API call to get ExceptionEvents
        api.call("Get", {
            typeName: "ExceptionEvent",
            search: search
        }, function (results) {
            loader.style.display = 'none';
            if (results && results.length > 0) {
                results.forEach(exception => {
                    const rule = allRules.find(r => r.id === exception.rule.id);
                    const asset = allAssets.find(d => d.id === exception.device.id);
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(exception.activeFrom).toLocaleString()}</td>
                        <td>${asset ? asset.name : 'Unknown Asset'}</td>
                        <td>${rule ? rule.name : 'Unknown Rule'}</td>
                        <td>${formatDuration(exception.duration)}</td>
                    `;
                    resultsBody.appendChild(row);
                });
            } else {
                resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No exceptions found for the selected criteria.</td></tr>';
            }
        }, function (error) {
            loader.style.display = 'none';
            console.error("API Call Failed:", error);
            resultsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Error fetching data: ${error}</td></tr>`;
        });
    };

    /**
     * Populates a dropdown <select> element with options
     */
    const populateFilter = (selectElement, items) => {
        items.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            selectElement.appendChild(option);
        });
    };

    /**
     * Initializes the page by fetching rules and assets for the filters
     */
    const initializePage = () => {
        // Use Promise.all to fetch rules and devices at the same time
        Promise.all([
            api.call("Get", { typeName: "Rule" }),
            api.call("Get", { typeName: "Device" })
        ]).then(function ([rules, assets]) {
            allRules = rules;
            allAssets = assets;
            
            // Populate the filter dropdowns
            populateFilter(ruleFilter, allRules);
            populateFilter(assetFilter, allAssets);
            
            // Add event listeners to the filters
            ruleFilter.addEventListener('change', fetchAndDisplayExceptions);
            assetFilter.addEventListener('change', fetchAndDisplayExceptions);
            
            // Perform the initial data fetch
            fetchAndDisplayExceptions();
            
        }).catch(function (error) {
            console.error("Initialization failed:", error);
            loader.textContent = "Could not load initial data. Please refresh.";
        });
    };
    
    // Start the application
    initializePage();
});