import React from 'react';

function SearchAndFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedDepartment, 
  setSelectedDepartment,
  departments,
  sensemakers,
  currentSensemaker,
  setCurrentSensemaker
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

        {sensemakers && sensemakers.length > 0 && (
          <div className="filter-group">
            <label>Sensemaker:</label>
            <select 
              value={currentSensemaker?.id || ''}
              onChange={(e) => {
                const selected = sensemakers.find(s => s.id === e.target.value);
                setCurrentSensemaker(selected);
                sessionStorage.setItem('currentSensemaker', e.target.value);
              }}
            >
              {sensemakers.map(sm => (
                <option key={sm.id} value={sm.id}>{sm.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchAndFilters;

