/**
 * PEP filters for the Index page
 * Filters PEP tables by Python version and type using the JSON API
 */
(function () {
  "use strict";

  const VERSION_STORAGE_KEY = "pep_version_filter";
  const TYPE_STORAGE_KEY = "pep_type_filter";
  const API_URL =
    document.currentScript?.dataset.apiUrl || "/api/peps.json";
  let pepVersionMap = {};
  let pepTypeMap = {};
  let allVersions = [];
  let allTypes = [];

  /**
   * Parse python_version string and extract individual versions
   * Handles formats like "3.10", "2.4, 2.5, 2.6", "2.7, 3.0"
   */
  function parseVersions(versionStr) {
    if (!versionStr) return [];
    return versionStr
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);
  }

  /**
   * Extract major.minor version from a version string
   * "3.10.1" -> "3.10", "3.10" -> "3.10"
   */
  function getMajorMinor(version) {
    const match = version.match(/^(\d+\.\d+)/);
    return match ? match[1] : version;
  }

  /**
   * Sort versions in descending order (newest first)
   * Handles both 2.x and 3.x versions
   */
  function sortVersionsDescending(versions) {
    return versions.sort((a, b) => {
      const [aMajor, aMinor] = a.split(".").map(Number);
      const [bMajor, bMinor] = b.split(".").map(Number);
      if (bMajor !== aMajor) return bMajor - aMajor;
      return bMinor - aMinor;
    });
  }

  /**
   * Fetch PEP data and build version and type maps
   */
  async function loadPepData() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch PEP data");
      const data = await response.json();

      const versionSet = new Set();
      const typeSet = new Set();

      for (const [pepNum, pep] of Object.entries(data)) {
        const versions = parseVersions(pep.python_version);
        pepVersionMap[pepNum] = versions;

        // Collect unique major.minor versions
        for (const v of versions) {
          const majorMinor = getMajorMinor(v);
          if (/^\d+\.\d+$/.test(majorMinor)) {
            versionSet.add(majorMinor);
          }
        }

        if (pep.type) {
          pepTypeMap[pepNum] = pep.type;
          typeSet.add(pep.type);
        }
      }

      allVersions = sortVersionsDescending([...versionSet]);
      allTypes = [...typeSet].sort();
      return true;
    } catch (error) {
      console.error("Error loading PEP data:", error);
      return false;
    }
  }

  /**
   * Extract PEP number from a table row
   */
  function getPepNumberFromRow(row) {
    const link = row.querySelector('a[href*="pep-"]');
    if (!link) return null;
    const match = link.getAttribute("href").match(/pep-0*(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if a PEP matches the selected version filter
   */
  function pepMatchesVersion(pepNum, selectedVersion) {
    if (!selectedVersion || selectedVersion === "all") return true;
    const pepVersions = pepVersionMap[pepNum] || [];
    return pepVersions.some((v) => getMajorMinor(v) === selectedVersion);
  }

  /**
   * Check if a PEP matches the selected type filter
   */
  function pepMatchesType(pepNum, selectedType) {
    if (!selectedType || selectedType === "all") return true;
    return pepTypeMap[pepNum] === selectedType;
  }

  /**
   * Apply the filters to all PEP tables
   */
  function applyFilter(selectedVersion, selectedType) {
    const tables = document.querySelectorAll("table.pep-zero-table");
    const filtersActive =
      (selectedVersion && selectedVersion !== "all") ||
      (selectedType && selectedType !== "all");
    let totalVisible = 0;
    let totalPeps = 0;

    tables.forEach((table) => {
      const rows = table.querySelectorAll("tbody tr");
      let visibleInTable = 0;

      rows.forEach((row) => {
        const pepNum = getPepNumberFromRow(row);
        if (pepNum === null) return;

        totalPeps++;
        const matches =
          pepMatchesVersion(pepNum, selectedVersion) &&
          pepMatchesType(pepNum, selectedType);

        if (matches) {
          row.style.display = "";
          visibleInTable++;
          totalVisible++;
        } else {
          row.style.display = "none";
        }
      });

      // Find the section container (h2 + table) and hide if empty
      const section = table.closest("section") || table.parentElement;
      const h2 = section?.querySelector("h2");
      if (h2 && visibleInTable === 0 && filtersActive) {
        section.style.display = "none";
      } else if (section) {
        section.style.display = "";
      }
    });

    updateCount(totalVisible, totalPeps, filtersActive);
  }

  /**
   * Update the count display
   */
  function updateCount(visible, total, filtersActive) {
    const countEl = document.getElementById("pep-filter-count");
    if (!countEl) return;

    if (!filtersActive) {
      countEl.textContent = "";
    } else {
      countEl.textContent = `Showing ${visible} of ${total} PEPs`;
    }
  }

  /**
   * Create the filter UI
   */
  function createFilterUI() {
    const container = document.createElement("div");
    container.id = "pep-version-filter";
    container.innerHTML = `
            <label for="pep-version-select">Filter by Python version:</label>
            <select id="pep-version-select">
                <option value="all">All versions</option>
            </select>
            <label for="pep-type-select">Type:</label>
            <select id="pep-type-select">
                <option value="all">All types</option>
            </select>
            <span id="pep-filter-count" aria-live="polite"></span>
        `;

    const versionSelect = container.querySelector("#pep-version-select");
    const typeSelect = container.querySelector("#pep-type-select");

    // Add version options
    for (const version of allVersions) {
      const option = document.createElement("option");
      option.value = version;
      option.textContent = version;
      versionSelect.appendChild(option);
    }

    // Add type options
    for (const type of allTypes) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    }

    // Restore saved selections
    const savedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    if (savedVersion && (savedVersion === "all" || allVersions.includes(savedVersion))) {
      versionSelect.value = savedVersion;
    }
    const savedType = localStorage.getItem(TYPE_STORAGE_KEY);
    if (savedType && (savedType === "all" || allTypes.includes(savedType))) {
      typeSelect.value = savedType;
    }

    // Handle filter changes
    versionSelect.addEventListener("change", () => {
      localStorage.setItem(VERSION_STORAGE_KEY, versionSelect.value);
      applyFilter(versionSelect.value, typeSelect.value);
    });
    typeSelect.addEventListener("change", () => {
      localStorage.setItem(TYPE_STORAGE_KEY, typeSelect.value);
      applyFilter(versionSelect.value, typeSelect.value);
    });

    return container;
  }

  /**
   * Insert the filter UI into the page
   */
  function insertFilterUI(filterUI) {
    // Find the "Index by Category" section and insert after its heading
    const indexByCategory = document.getElementById("index-by-category");
    if (indexByCategory) {
      const heading = indexByCategory.querySelector("h2");
      if (heading) {
        heading.after(filterUI);
        return true;
      }
    }

    return false;
  }

  /**
   * Initialize the filter
   */
  async function init() {
    // Only run on PEP 0 (index page)
    const isPepIndex =
      document.querySelector("section#introduction") &&
      document.querySelector("table.pep-zero-table");
    if (!isPepIndex) return;

    const loaded = await loadPepData();
    if (!loaded || (allVersions.length === 0 && allTypes.length === 0)) return;

    const filterUI = createFilterUI();
    const inserted = insertFilterUI(filterUI);

    if (inserted) {
      // Apply initial filter
      const savedVersion = localStorage.getItem(VERSION_STORAGE_KEY) || "all";
      const savedType = localStorage.getItem(TYPE_STORAGE_KEY) || "all";
      if (savedVersion !== "all" || savedType !== "all") {
        applyFilter(savedVersion, savedType);
      }
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
