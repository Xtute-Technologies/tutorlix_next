/**
 * Creates a standardized adapter function for DataTableServer.
 * * @param {Function} apiFunc - The service function (e.g., authService.getAllUsers)
 * @param {Object} options - Configuration options
 * @param {Object} options.sortMap - Maps table column IDs to backend API fields (e.g., { full_name: 'first_name' })
 * * @returns {Function} An async function compatible with DataTableServer
 */
export const createTableAdapter = (apiFunc, { sortMap = {} } = {}) => {
  
  return async ({ pageIndex, pageSize, search, sorting, ...filters }) => {
    try {
      // 1. Handle Sorting Transformation
      let ordering = "";
      if (sorting && sorting.length > 0) {
        const { id, desc } = sorting[0];
        // Check if we have a specific mapping for this column, otherwise use the column ID
        const apiField = sortMap[id] || id; 
        ordering = desc ? `-${apiField}` : apiField;
      }

      // 2. Call the API
      // We spread ...filters to allow passing things like 'role', 'status', etc.
      const response = await apiFunc({
        page: pageIndex + 1, // Convert 0-based (Table) to 1-based (API)
        page_size: pageSize,
        search: search || undefined,
        ordering: ordering || undefined,
        ...filters, 
      });

      // 3. Standardize Response
      return {
        rows: response.results || [],
        pageCount: Math.ceil((response.count || 0) / pageSize),
        totalCount: response.count || 0,
      };

    } catch (error) {
      console.error("Table Adapter Error:", error);
      // Return empty structure on error so table doesn't crash
      return { rows: [], pageCount: 0, totalCount: 0 };
    }
  };
};