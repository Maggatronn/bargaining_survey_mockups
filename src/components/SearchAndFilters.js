import React from 'react';

function SearchAndFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedDepartment, 
  setSelectedDepartment,
  departments
}) {
  return (
    <div className="controls">
      <div className="filters-inline">
        <div className="filter-group">
          <label>Department:</label>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept || 'Unknown'}</option>
            ))}
          </select>
        </div>

        <div className="search-box-inline">
          <input
            type="text"
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default SearchAndFilters;

